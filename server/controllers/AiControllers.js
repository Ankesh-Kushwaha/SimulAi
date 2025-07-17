import OpenAI from "openai";
import sql from "../config/db.js";
import { clerkClient } from "@clerk/express";
import axios from "axios";
import {v2 as cloudinary} from 'cloudinary'
import { effect } from "zod";
import fs from 'fs';
import pdf from 'pdf-parse/lib/pdf-parse.js'

const AI = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});



//generate article;
export const generateArticle = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, length } = req.body;
    const plan = req.plan;
    const free_usage = req.free_usage;

    if (plan !== 'premium' && free_usage >= 10) {
      return res.json({
        success: "false",
        message:"limit reached. Upgrade to premium to continue",
       })
    }

    //generating article
    const response = await AI.chat.completions.create({
        model: "gemini-2.0-flash",
        messages: [
            {
                role: "user",
                content:prompt,
            },
      ],
      temperature: 0.7,
      max_tokens:length
    });


    const content = response.choices[0].message.content;
    await sql`INSERT INTO creations (user_id,prompt,content,type) VALUES(${userId} ,${prompt},${content},'article')`;

    if (plan !== 'premium') {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: {
          free_usage: free_usage + 1
        }
      })
    }

    res.json({ success: true, content });

  }
  catch (err) {
    console.log(err.message);
    res.json({
      success: false,
      message:err.message,
    })
  }
}


export const generateBlogTitle = async (req, res) => {
  try {
    const { userId } = req.auth();
    const {prompt} = req.body;
    const plan = req.plan;
    const free_usage = req.free_usage;

    if (plan !== 'premium' && free_usage >= 10) {
      return res.json({
        success: "false",
        message:"limit reached. Upgrade to premium to continue",
       })
    }

    //generating Blog
    const response = await AI.chat.completions.create({
        model: "gemini-2.0-flash",
        messages: [
            {
                role: "user",
                content:prompt,
            },
      ],
      temperature: 0.7,
      max_tokens:100
    });


    const content = response.choices[0].message.content;
    await sql`INSERT INTO creations (user_id,prompt,content,type) VALUES(${userId} ,${prompt},${content},'blog_article')`;

    if (plan !== 'premium') {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: {
          free_usage: free_usage + 1
        }
      })
    }

    res.json({ success: true, content });

  }
  catch (err) {
    console.log(err.message);
    res.json({
      success: false,
      message:err.message,
    })
  }
}


export const generateImage = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt,publish} = req.body;
    const plan = req.plan;

    if (plan !== 'premium') {
      return res.json({
        success: "false",
        message:"This feature is available only for premium subscription. Upgrade to premium to continue",
       })
    }

    //clip drop  api to generate the image 
    const formData = new FormData();
    formData.append('prompt', prompt);

   const {data}= await axios.post("https://clipdrop-api.co/text-to-image/v1", formData, {
     headers: {
       'x-api-key': process.env.CLIP_DROP_API_KEY,
     },
      responseType:"arraybuffer",
   })
    
    //console.log("data: ",data);
    
    const base64Image = `data:image/png;base64,${Buffer.from(data, 'binary').toString('base64')}`
    //console.log("encoded image: ",base64Image);
    //upload the image to cloudinary strorage
    const { secure_url } = await cloudinary.uploader.upload(base64Image);
    
    //storing the data in the database
    await sql`INSERT INTO creations (user_id,prompt,content,type,publish) VALUES(${userId} ,${prompt},${secure_url},'image',${publish ?? false})`;
   
    res.json({ success: true, content:secure_url });

  }
  catch (err) {
    res.json({
      success: false,
      message:err.message,
    })
  }
}


export const removeImageBackground = async (req, res) => {
  try {
    const { userId } = req.auth();
    const image = req.file;
    const plan = req.plan;

    if (plan !== 'premium') {
      return res.json({
        success: "false",
        message:"This feature is available only for premium subscription. Upgrade to premium to continue",
       })
    }

    //remove background
    const { secure_url } = await cloudinary.uploader.upload(image.path, {
      transformation: [
        {
          effect: 'background_removal',
          background_removal:'remove_the_background'
        }
      ]
    });

    //storing the data in the database
    await sql`INSERT INTO creations (user_id,prompt,content,type) VALUES(${userId} ,'Remove background from the image',${secure_url},'image')`;
   
    res.json({ success: true, content:secure_url });

  }
  catch (err) {
    res.json({
      success: false,
      message:err.message,
    })
  }
}

export const removeImageObject = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { object } = req.body;
    const  image = req.file;
    const plan = req.plan;

    if (plan !== 'premium') {
      return res.json({
        success: "false",
        message:"This feature is available only for premium subscription. Upgrade to premium to continue",
       })
    }

    //remove background
    const { public_id } = await cloudinary.uploader.upload(image.path);

    const imageUrl=cloudinary.url(public_id, {
      transformation: [
        {
          effect:`gen_remove:${object}`
        }
      ],
      resource_type:'image'
    })

    //storing the data in the database
    await sql`INSERT INTO creations (user_id,prompt,content,type) VALUES(${userId} ,${`Remove ${object} from image`},${imageUrl},'image')`;
   
    res.json({ success: true, content:imageUrl });

  }
  catch (err) {
    res.json({
      success: false,
      message:err.message,
    })
  }
}

export const resumeReview = async (req, res) => {
  try {
    const { userId } = req.auth();
    const resume=req.file
    const plan = req.plan;
   

    if (plan !== 'premium') {
      return res.json({
        success: "false",
        message:"This feature is available only for premium subscription. Upgrade to premium to continue",
       })
    }

    if (resume.size > 5 * 1024 * 1024) {
      return res.status(200).json({
        success: false,
        message:"resume file size exceed 5MB"
      })
    }
    
    //coverting resume into file buffer
    const dataBuffer = fs.readFileSync(resume.path);
    const pdfData = await pdf(dataBuffer);
    
    //prompt for resume review
    const prompt=`Review the following resume and provide constructive feedback on its strengths ,weakness,and areas for improvement.Resume Content:\n\n ${pdfData.text}`
  
    //generating review from the gemini 
     const response = await AI.chat.completions.create({
        model: "gemini-2.0-flash",
        messages: [
            {
                role: "user",
                content:prompt,
            },
      ],
      temperature: 0.7,
      max_tokens:1000
    });
   
    const content = response.choices[0].message.content;
    //storing the data in the database
    await sql`INSERT INTO creations (user_id,prompt,content,type) VALUES(${userId} ,'Review the uploaded Resume',${content},'resume-review')`;
   
    res.json({ success: true, content:content });
  }
  catch (err) {
    console.log(err.message);
    res.json({
      success: false,
      message:err.message,
    })
  }
}











