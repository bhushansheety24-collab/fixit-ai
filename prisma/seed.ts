import { PrismaClient, UserRole } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";

const prisma = new PrismaClient();

async function main() {
  // Create demo repair professionals if none exist.
  const count = await prisma.repairProfessional.count();
  if (count === 0) {
    await prisma.repairProfessional.createMany({
      data: [
        {
          name: "GreenTech Electronics Repair",
          description:
            "Certified electronics repair specialists with 10+ years of experience in consumer devices.",
          specializations: ["Electronics", "Other"],
          serviceArea: "Mumbai, Maharashtra",
          startingPrice: 500,
          workingHours: "Mon-Sat 09:00 - 18:00",
          contactEmail: "info@greentech-repair.example.com",
          contactPhone: "+91 98765 43210",
          verified: true,
          isDemo: true,
          averageRating: 4.8,
          reviewCount: 124,
        },
        {
          name: "UrbanFix Appliance Care",
          description:
            "Specialised in home appliance repair, maintenance, and parts sourcing.",
          specializations: ["Home Appliances"],
          serviceArea: "Delhi NCR",
          startingPrice: 800,
          workingHours: "Mon-Sun 08:00 - 20:00",
          contactEmail: "support@urbanfix-appliance.example.com",
          contactPhone: "+91 99999 12345",
          verified: true,
          isDemo: true,
          averageRating: 4.7,
          reviewCount: 86,
        },
        {
          name: "Revive Furniture Workshop",
          description:
            "Restoration, repair, and refurbishment of wooden and upholstered furniture.",
          specializations: ["Furniture"],
          serviceArea: "Bangalore, Karnataka",
          startingPrice: 600,
          workingHours: "Tue-Sat 10:00 - 17:00",
          contactEmail: "hello@revive-furniture.example.com",
          contactPhone: "+91 90000 67890",
          verified: true,
          isDemo: true,
          averageRating: 4.9,
          reviewCount: 52,
        },
      ],
    });
    console.info("Seeded demo repair professionals.");
  }

  // Optional admin account. Created with a real credential account (password
  // hashed by Better Auth) so it can actually sign in. Re-running the seed
  // promotes an existing account instead of duplicating it.
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

    if (!existing) {
      const userId = randomUUID();
      const passwordHash = await hashPassword(adminPassword);

      await prisma.user.create({
        data: {
          id: userId,
          name: process.env.SEED_ADMIN_NAME || "FixIt Admin",
          email: adminEmail,
          emailVerified: true,
          role: UserRole.ADMIN,
          accounts: {
            create: {
              id: randomUUID(),
              accountId: adminEmail,
              providerId: "credential",
              password: passwordHash,
            },
          },
        },
      });
      console.info("Seeded admin account:", adminEmail);
    } else {
      const hasCredential = await prisma.account.findFirst({
        where: { userId: existing.id, providerId: "credential" },
      });
      if (!hasCredential) {
        await prisma.account.create({
          data: {
            id: randomUUID(),
            accountId: adminEmail,
            providerId: "credential",
            userId: existing.id,
            password: await hashPassword(adminPassword),
          },
        });
      }
      if (existing.role !== UserRole.ADMIN) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { role: UserRole.ADMIN },
        });
      }
      console.info("Admin account ready:", adminEmail);
    }
  } else {
    console.info(
      "Skipped admin seeding (set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create one).",
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
