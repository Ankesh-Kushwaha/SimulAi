import express from 'express';
import { getPublishedCreation, getuserCreation, toggleLikeCreation } from '../controllers/userController.js';
import {auth} from '../middlewares/auth.js'
const userRouter = express.Router();

userRouter.get('/get-user-creation', auth, getuserCreation);
userRouter.get('/get-published-creation', auth, getPublishedCreation);
userRouter.post('toggle-like-creation', auth, toggleLikeCreation);

export default userRouter;