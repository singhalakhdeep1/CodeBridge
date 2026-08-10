import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding CodeBridge database...');

  const dev = await prisma.user.upsert({
    where: { email: 'dev@codebridge.io' },
    update: {},
    create: {
      email: 'dev@codebridge.io',
      name: 'Lead Developer',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde',
    },
  });

  const project = await prisma.project.upsert({
    where: { slug: 'collaborative-editor' },
    update: {},
    create: {
      name: 'Collaborative IDE Engine',
      slug: 'collaborative-editor',
      description: 'Real-time WebSockets & WASM powered code editor',
      members: {
        create: {
          userId: dev.id,
          role: 'OWNER',
        },
      },
    },
  });

  await prisma.snippet.create({
    data: {
      title: 'WASM Vector Operations',
      code: 'export function add_vectors(a: Float64Array, b: Float64Array): Float64Array { ... }',
      language: 'rust',
      projectId: project.id,
      authorId: dev.id,
    },
  });

  console.log('Seeding complete for CodeBridge.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
