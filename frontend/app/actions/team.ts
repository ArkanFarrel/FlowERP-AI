/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";

// Helper untuk mengambil ID user yang sedang login
async function getAuthUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (token) return token;
  return null;
}

/**
 * Mengambil daftar anggota tim perusahaan pengguna saat ini
 */
export async function getCompanyTeamMembers() {
  try {
    const currentUserId = await getAuthUserId();
    if (!currentUserId) {
      return { success: false, error: "Sesi pengguna tidak valid." };
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!currentUser || !currentUser.companyId) {
      return { success: false, error: "Data perusahaan tidak ditemukan." };
    }

    const members = await prisma.user.findMany({
      where: { companyId: currentUser.companyId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      currentUserId: currentUser.id,
      currentUserRole: currentUser.role,
      members,
    };
  } catch (error) {
    console.error("getCompanyTeamMembers error:", error);
    return { success: false, error: "Gagal mengambil daftar anggota tim." };
  }
}

/**
 * Mengubah Role anggota tim (Hanya boleh dilakukan oleh OWNER / MANAGER)
 */
export async function updateUserRole(targetUserId: string, newRole: Role) {
  try {
    const currentUserId = await getAuthUserId();
    if (!currentUserId) {
      return { success: false, error: "Sesi tidak valid." };
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!currentUser || (currentUser.role !== "OWNER" && currentUser.role !== "MANAGER")) {
      return { success: false, error: "Anda tidak memiliki izin (hanya Owner/Manager yang dapat mengubah Role)." };
    }

    // Tidak boleh mengubah role diri sendiri jika dia satu-satunya Owner
    if (targetUserId === currentUser.id && newRole !== "OWNER" && currentUser.companyId) {
      const ownerCount = await prisma.user.count({
        where: { companyId: currentUser.companyId, role: "OWNER" },
      });
      if (ownerCount <= 1) {
        return { success: false, error: "Anda tidak dapat menurunkan role Anda sendiri karena Anda adalah satu-satunya Owner." };
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole as any },
    });

    return {
      success: true,
      message: `Role pengguna ${updatedUser.name} berhasil diubah menjadi ${newRole}.`,
    };
  } catch (error) {
    console.error("updateUserRole error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Gagal memperbarui Role pengguna: ${msg}` };
  }
}

/**
 * Menambahkan anggota tim baru ke dalam perusahaan
 */
export async function addTeamMember(data: {
  name: string;
  email: string;
  password?: string;
  role: Role;
}) {
  try {
    const currentUserId = await getAuthUserId();
    if (!currentUserId) {
      return { success: false, error: "Sesi tidak valid." };
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!currentUser || !currentUser.companyId || (currentUser.role !== "OWNER" && currentUser.role !== "MANAGER")) {
      return { success: false, error: "Anda tidak memiliki hak untuk menambah anggota tim baru." };
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return { success: false, error: "Email sudah terdaftar dalam sistem." };
    }

    const defaultPassword = data.password || "FlowERP123!";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const newUser = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role,
        companyId: currentUser.companyId,
      },
    });

    return {
      success: true,
      message: `Anggota tim ${newUser.name} berhasil ditambahkan dengan role ${newUser.role}!`,
      defaultPassword: data.password ? undefined : defaultPassword,
    };
  } catch (error) {
    console.error("addTeamMember error:", error);
    return { success: false, error: "Gagal menambahkan anggota tim." };
  }
}
