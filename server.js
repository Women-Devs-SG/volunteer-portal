import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import taskRoutes from './api/create-task.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serves index.html & app.js

// Mount API Routes
app.use('/api', taskRoutes);

app.listen(PORT, () => {
  console.log(`🚀 WDS Ops App running locally at http://localhost:${PORT}`);
});