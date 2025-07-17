import { clerkClient ,getAuth} from "@clerk/express";



//middleware to check user id and has premium plan
export const auth = async (req, res, next) => {
  try {    
    const { userId, has } = await req.auth();
    console.log(userId);
    const hasPremiumPlan = await has({ plan: 'premium' });

    const user = await clerkClient.users.getUser(userId);
    if (!hasPremiumPlan && user.privateMetadata.free_usage) {
      req.free_usage = user.privateMetadata.free_usage;
    }
    else {
      await clerkClient.users.updateUserMetadata(userId, {
        free_usage:0
      })

      req.free_usage = 0;
    }
    
    req.plan = hasPremiumPlan ? 'premium' : 'free';
    next();
  }
  catch (err) {
    res.status(500).json({
      success: false,
      message:err.message,
    })
  }
}

