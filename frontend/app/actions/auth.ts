'use server';

import { prisma } from "@/lib/prisma";
import { loginSchema, registerSchema } from "@/lib/validations";
import { cookies } from "next/headers";
import { clearAuthCookies } from '@/app/actions/auth-cookie';
import bcrypt from "bcryptjs";

export async function loginUser(formData: { email?: string; password?: string }) {
  const validated = loginSchema.safeParse(formData);
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  const { email, password } = validated.data;

  try {
    const { prisma } = await import("@/lib/prisma");
    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: true },
    });

    if (!user) {
      return { success: false, error: "Email atau password tidak terdaftar." };
    }

    const isMatch = await bcrypt.compare(password, user.password);
    // Fallback check for old plain text passwords if any
    const isPlainTextMatch = user.password === password;
    if (!isMatch && !isPlainTextMatch) {
      return { success: false, error: "Email atau password salah." };
    }
    if (isPlainTextMatch && !isMatch) {
      // Upgrade password to hashed
      const newHashed = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: newHashed },
      });
    }

    const cookieStore = await cookies();
    cookieStore.set("auth_token", user.id, { httpOnly: true, path: "/", maxAge: 365 * 24 * 60 * 60 });
    cookieStore.set("user_role", (user.role || "OWNER").toUpperCase(), { httpOnly: true, path: "/", maxAge: 365 * 24 * 60 * 60 });

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyName: user.company?.name || "FlowERP AI",
      },
    };
  } catch (error) {
    console.error("Login error:", error);
    return {
      success: false,
      error: "Gagal terhubung ke server autentikasi. Silakan periksa jaringan database.",
    };
  }
}

export async function registerUser(formData: {
  name?: string;
  companyName?: string;
  email?: string;
  password?: string;
}) {
  const validated = registerSchema.safeParse(formData);
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  const { name, companyName, email, password } = validated.data;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return { success: false, error: "Email sudah terdaftar" };
    }

    const company = await prisma.company.create({
      data: {
        name: companyName,
        currency: "USD",
        taxRate: 10,
      },
    });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "OWNER",
        companyId: company.id,
      },
    });

    const cookieStore = await cookies();
    cookieStore.set("auth_token", user.id, { httpOnly: true, path: "/", maxAge: 365 * 24 * 60 * 60 });
    cookieStore.set("user_role", "OWNER", { httpOnly: true, path: "/", maxAge: 365 * 24 * 60 * 60 });

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyName: company.name,
      },
    };
  } catch (error) {
    console.error("Register error:", error);
    return {
      success: false,
      error: "Gagal mendaftarkan akun baru. Silakan coba lagi.",
    };
  }
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete("auth_token");
  await clearAuthCookies();
  return { success: true };
}

export async function getCurrentUserProfile() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("auth_token")?.value;
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { company: true },
      });
      if (user) {
        return {
          success: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            companyName: user.company?.name || "FlowERP Store",
          },
        };
      }
    }
  } catch (error) {
    console.warn("getCurrentUserProfile note:", error instanceof Error ? error.message : String(error));
  }
  return { success: false };
}

export async function updateUserPassword(formData: {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("auth_token")?.value;

  if (!userId) {
    return { success: false, error: "Sesi pengguna tidak ditemukan. Silakan login ulang." };
  }

  const { currentPassword, newPassword, confirmPassword } = formData;

  if (!currentPassword || !newPassword) {
    return { success: false, error: "Password saat ini dan password baru wajib diisi." };
  }

  if (newPassword.length < 6) {
    return { success: false, error: "Password baru minimal 6 karakter." };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, error: "Konfirmasi password baru tidak cocok." };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, error: "Pengguna tidak ditemukan di database." };
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    const isPlainTextMatch = user.password === currentPassword;

    if (!isMatch && !isPlainTextMatch) {
      return { success: false, error: "Password saat ini yang Anda masukkan salah." };
    }

    const newHashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: newHashedPassword },
    });

    return { success: true, message: "Password berhasil diperbarui di database!" };
  } catch (error) {
    console.error("updateUserPassword error:", error);
    return { success: false, error: "Gagal memperbarui password di database." };
  }
}

export async function updateUserProfile(data: {
  companyName?: string;
  businessEmail?: string;
}) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("auth_token")?.value;

  if (!userId) {
    return { success: false, error: "Sesi pengguna tidak ditemukan." };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!user) {
      return { success: false, error: "User tidak ditemukan di database." };
    }

    let updatedCompanyName = user.company?.name || "FlowERP Store";
    if (data.companyName && user.companyId) {
      const updatedCompany = await prisma.company.update({
        where: { id: user.companyId },
        data: { name: data.companyName },
      });
      updatedCompanyName = updatedCompany.name;
    }

    let updatedEmail = user.email;
    if (data.businessEmail && data.businessEmail !== user.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email: data.businessEmail },
      });
      if (!existingEmail) {
        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: { email: data.businessEmail },
        });
        updatedEmail = updatedUser.email;
      }
    }

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: updatedEmail,
        role: user.role,
        companyName: updatedCompanyName,
      },
    };
  } catch (error) {
    console.error("updateUserProfile error:", error);
    return { success: false, error: "Gagal memperbarui profil di database." };
  }
}


