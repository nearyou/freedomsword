import express from 'express';
import app from './dist/application.js';

// Vercel's Express preset discovers this entry after the build bundles local imports.
void express;
export default app;
