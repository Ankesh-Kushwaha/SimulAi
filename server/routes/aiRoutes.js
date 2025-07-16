import express from 'express';
import { generateArticle } from '../controllers/AiControllers.js';
import { auth } from '../middlewares/auth.js';

const aiRouter = express.Router();

aiRouter.post('/generate-article', (req,res,next) => {
  console.log('api hits');
  next()
}, auth, generateArticle);

export default aiRouter;