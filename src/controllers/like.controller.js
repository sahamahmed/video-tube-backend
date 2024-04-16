import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const userId = req.user._id 
    const likeOnCommentExists = await Like.findOne({ video: videoId, likedBy:userId});
    // console.log(likeOnCommentExists)
    let like 
    if (likeOnCommentExists) {
        await Like.findByIdAndDelete(likeOnCommentExists._id)
        like = 0
        // console.log("if ran")
    }else{
        await Like.create({ 
            video: videoId,     
            likedBy: userId   
        })
        like = 1
        // console.log("else ran")  
    }

    const numberOfLikesOnVideo = await Like.countDocuments({video: videoId})
    res
    .status(200)
    .json(new ApiResponse(200 , numberOfLikesOnVideo , ` ${like}` ))  
})



const toggleCommentLike = asyncHandler(async (req, res) => {
    const userId = req?.user._id
    const {commentId} = req.params
    let like = ""
    const likeOnCommentExists = await Like.findOne({
      comment: commentId,
      likedBy: userId,
    });
    if (likeOnCommentExists) {
      await Like.findByIdAndDelete(likeOnCommentExists._id);
      like = "unliked"
    } else {
      await Like.create({
        comment: commentId,
        likedBy: userId,
      });
      like = "liked"
    }

    const numberOfLikesOnComment = await Like.countDocuments({ comment: commentId });
    res
      .status(200)
      .json(
        new ApiResponse(200, numberOfLikesOnComment, `${like}`)
      );  

})   



const getLikedVideos = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
        pipeline: [
         
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
          {
            $project: {
              title: 1,
              thumbnail: 1,
              duration: 1,
              owner: 1,
              views: 1
            },
          },
        ],
      },
    },
    {
      $addFields: {
        video: {
          $first: "$video",
        },
      },
    },
  ]);
  res
    .status(200)
    .json(
      new ApiResponse(200, likedVideos, "liked videos fetched successfully")
    );
});


export {
    toggleCommentLike,
    toggleVideoLike,
    getLikedVideos
}