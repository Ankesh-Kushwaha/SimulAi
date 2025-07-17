import sql from "../config/db.js";


export const getuserCreation = async (req,res) => {
  try{
    const { userId } = req.auth();
    const data=await sql`SELECT * FROM creations WHERE user_id=${userId} ORDER BY created_at DESC`;
    res.status(200).json({ success: true, creations: data });
  }
  catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
     })
  }
}

export const getPublishedCreation = async (req, res) => {
  try {
    const creations = await sql`SELECT * FROM creations WHERE publish=true ORDER BY created_at DESC`
    res.status(200).json({success:true,creations})
  }
  catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
     })
  }
}

export const toggleLikeCreation = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { id } = req.body;
   
    const [creation] = await sql`SELECT * FROM creations WHERE id=${id}`
    
    if (!creation) {
      return res.json({
        success: false,
        message: "cretion not found"
      })
    }
   
    const currentLikes = creation.likes;
    const userIdStr = userId.toString();
    let updatedLikes;
    let message;

    if (currentLikes.includes(userIdStr)) {
      updatedLikes = currentLikes.filter((user) => user !== userIdStr);
      message = 'Creation Unliked';
    }
    else {
      updatedLikes = [...currentLikes, userIdStr];
      message: 'creation Liked'
    }
    
    const formatedArray = `{${updatedLikes.join(',')}}`;

    //updating the data in the dataBase
    await sql`UPDATE creations SET likes= ${formatedArray} :: text[] WHERE id=${id}`;
    res.status(200).json({ success: true, message })
  }
  catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
};
