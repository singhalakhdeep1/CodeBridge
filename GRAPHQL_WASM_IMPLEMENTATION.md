# CodeBridge - GraphQL Subscriptions & WASM Implementation

## Overview
This document describes the GraphQL Subscriptions and WebAssembly (WASM) implementation added to CodeBridge.

## Technologies Added

### 1. GraphQL Subscriptions
- **Apollo Client** - GraphQL client with subscription support
- **GraphQL WS** - WebSocket transport for GraphQL subscriptions
- **Apollo Server** - GraphQL server for Next.js API routes
- **GraphQL Subscriptions** - Real-time data synchronization

### 2. WebAssembly (WASM)
- **Rust WASM Module** - High-performance computations
- **wasm-pack** - Build tool for Rust to WASM

### 3. Vercel Deployment
- **vercel.json** - Deployment configuration
- Environment variables setup
- Edge functions configuration
- Security headers

## Files Created

### GraphQL
- `lib/graphql/schema.ts` - GraphQL type definitions
- `lib/graphql/resolvers.ts` - GraphQL resolvers with PubSub
- `lib/graphql/apollo-client.ts` - Apollo client setup with WebSocket
- `lib/graphql/ApolloProvider.tsx` - React provider wrapper
- `app/api/graphql/route.ts` - Next.js API route for GraphQL
- `components/GraphQLCollaboration.tsx` - Real-time collaboration component

### WASM
- `wasm/src/lib.rs` - Rust WASM functions (add, multiply, fibonacci, is_prime, quick_sort)
- `wasm/Cargo.toml` - Rust project configuration
- `lib/wasm/useWasm.ts` - React hook for WASM loading
- `components/WasmCalculator.tsx` - WASM calculator component

### Deployment
- `vercel.json` - Vercel deployment configuration

## Integration

### Layout Update
- `app/layout.tsx` - Wrapped with ApolloProvider

### Package.json Updates
- Added GraphQL dependencies
- Added WASM build script

## Usage

### Building WASM
```bash
pnpm wasm:build
```

### GraphQL API
- HTTP: `http://localhost:3000/api/graphql`
- WebSocket: `ws://localhost:3000/api/graphql`

### Subscriptions Available
- `sessionUpdated` - Real-time code collaboration updates
- `userJoinedSession` - User join notifications
- `userLeftSession` - User leave notifications
- `projectCreated` - New project notifications
- `projectUpdated` - Project update notifications

### WASM Functions
- `add(a, b)` - Addition
- `multiply(a, b)` - Multiplication
- `fibonacci(n)` - Fibonacci sequence
- `is_prime(n)` - Prime number check
- `quick_sort(arr)` - Quick sort algorithm

## Installation Required

To use these features, run:
```bash
pnpm install
```

This will install:
- @apollo/client
- graphql
- graphql-ws
- graphql-subscriptions
- @apollo/server
- @as-integrations/next

## Notes
- All code is written but packages are not installed (per user request)
- TypeScript errors are expected until packages are installed
- WASM requires Rust and wasm-pack to build
- GraphQL subscriptions require WebSocket support
