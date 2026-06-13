const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Initialize Prisma directly
const prisma = new PrismaClient();

async function seed() {
  try {
    console.log('🌱 Starting seed...');

    // =========================
    // CREATE ADMIN USER
    // =========================
    const adminPassword = await bcrypt.hash('admin@123', 10);
    
    const admin = await prisma.user.upsert({
      where: { email: 'admin@cheapflix.com' },
      update: {},
      create: {
        id: 'admin_user_1',
        email: 'admin@cheapflix.com',
        password: adminPassword,
        firstName: 'Admin',
        lastName: 'Cheapflix',
        phone: '+977-9841999999',
        role: 'admin',
        status: 'active'
      }
    });

    console.log('✅ Created admin account');
    console.log('📧 Admin Email: admin@cheapflix.com');
    console.log('🔐 Admin Password: admin@123');

    // =========================
    // PROVIDERS DATA
    // =========================
    const providers = [
      {
        id: 'provider_1',
        email: 'rajesh@cheapflix.com',
        password: 'password123',
        firstName: 'Rajesh',
        lastName: 'Maharjan',
        phone: '+977-9841000001',
        role: 'provider',
        category: 'Electrician',
        bio: 'Senior Electrician with 8 years of experience',
        experience: 8,
        verified: true
      },
      {
        id: 'provider_2',
        email: 'kiran@cheapflix.com',
        password: 'password123',
        firstName: 'Kiran',
        lastName: 'Thapa',
        phone: '+977-9841000002',
        role: 'provider',
        category: 'Electrician',
        bio: 'Electrician & AC Specialist with 5 years experience',
        experience: 5,
        verified: false
      },
      {
        id: 'provider_3',
        email: 'binod@cheapflix.com',
        password: 'password123',
        firstName: 'Binod',
        lastName: 'Shrestha',
        phone: '+977-9841000003',
        role: 'provider',
        category: 'Electrician',
        bio: 'Master Electrician with 12 years experience',
        experience: 12,
        verified: true
      },
      {
        id: 'provider_4',
        email: 'dinesh@cheapflix.com',
        password: 'password123',
        firstName: 'Dinesh',
        lastName: 'Lama',
        phone: '+977-9841000004',
        role: 'provider',
        category: 'Electrician',
        bio: 'CCTV & Solar specialist with 6 years experience',
        experience: 6,
        verified: false
      }
    ];

    // =========================
    // CREATE USERS + PROVIDERS
    // =========================
    for (const p of providers) {
      const hashedPassword = await bcrypt.hash(p.password, 10);

      // USER TABLE
      const user = await prisma.user.upsert({
        where: { email: p.email },
        update: {},
        create: {
          id: `${p.id}_user`,
          email: p.email,
          password: hashedPassword,
          firstName: p.firstName,
          lastName: p.lastName,
          phone: p.phone,
          role: p.role,
          status: 'active'
        }
      });

      // PROVIDER TABLE
      await prisma.provider.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          id: p.id,
          userId: user.id,
          category: p.category,
          bio: p.bio,
          experience: p.experience,
          verified: p.verified,
          rating:
            p.id === 'provider_1'
              ? 5.0
              : p.id === 'provider_3'
              ? 4.9
              : p.id === 'provider_2'
              ? 4.7
              : 4.6
        }
      });

      console.log(`✅ Created provider: ${p.firstName}`);
    }

    // =========================
    // SERVICES DATA
    // =========================
    const services = [
      {
        id: 'service_electrician',
        providerId: 'provider_1',
        name: 'Electrical Installation & Repair',
        description: 'Professional electrical installation and repair services',
        price: 800,
        duration: 60
      },
      {
        id: 'service_electrician_2',
        providerId: 'provider_2',
        name: 'AC & Electrical Services',
        description: 'AC installation and electrical services',
        price: 650,
        duration: 60
      },
      {
        id: 'service_electrician_3',
        providerId: 'provider_3',
        name: 'Master Electrical Work',
        description: 'Complete electrical solutions from master electrician',
        price: 900,
        duration: 60
      },
      {
        id: 'service_electrician_4',
        providerId: 'provider_4',
        name: 'CCTV & Solar Services',
        description: 'CCTV installation and solar energy solutions',
        price: 700,
        duration: 60
      }
    ];

    // =========================
    // CREATE SERVICES
    // =========================
    for (const s of services) {
      await prisma.service.upsert({
        where: { id: s.id },
        update: {},
        create: {
          id: s.id,
          providerId: s.providerId,
          name: s.name,
          description: s.description,
          price: s.price,
          duration: s.duration
        }
      });

      console.log(`✅ Created service: ${s.name}`);
    }

    console.log('🌱 Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();