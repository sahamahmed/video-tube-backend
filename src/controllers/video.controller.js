import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { v2 as cloudinary } from "cloudinary";
import { Like } from "../models/like.model.js"

const getAllVideos = asyncHandler(async (req, res) => {
  let { page = 1, limit = 6, query, sortBy, sortType, userId } = req.query;
  page = parseInt(page);
  limit = parseInt(limit);
  let filter = { isPublished: true };
  let sort = {};            

  if (query) {
    filter.title = { $regex: query, $options: "i" };
  }

  if (sortBy && sortType) {
    sort[sortBy] = sortType === "desc" ? -1 : 1;
  }

  if (userId) {
    filter.owner = new mongoose.Types.ObjectId(userId);
  }

  const startIndex = (page - 1) * limit;
   const endIndex = page * limit;

  const results = {};

  results.totalCount = await Video.countDocuments(filter);


  try {
    results.videos = await Video.aggregate([
   
      { $match: filter },
      { $sort: sort },
      { $skip: startIndex },
      { $limit: limit },
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
          description: 1,
          owner: 1,
          views: 1,
          duration: 1,
          createdAt:1 
        },
      },
    ]);

    res
      .status(200)
      .json(new ApiResponse(200, results, "All videos fetched successfully"));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

   
const publishAVideo = asyncHandler(async (req, res) => {
//title and description
  const { title, description } = req.body;
    if (
      [title, description].some(
        (field) => field?.trim() === ""
      )
    ) {
      throw new ApiError(400, "All fields are required");
    }
//thumbnail
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;
    if (!thumbnailLocalPath) {
        throw new ApiError(400 , "THumbnail File is required")
    }
    const thumbnail= await uploadOnCloudinary(thumbnailLocalPath)
    if (!thumbnail) {
      throw new ApiError(500, "thumbnail file unable to upload on cloudinary");
    }
    // console.log("thumbnail:" , thumbnail)
//video
    const videoLocalPath = req.files?.videoFile[0]?.path
    if (!videoLocalPath) {
        throw new ApiError(400 , "Video file is required")
    }
    let videoFile = await uploadOnCloudinary(videoLocalPath)
    if (!videoFile) {
      throw new ApiError(500, "Video file unable to upload on cloudinary");
    }
//duration
    let duration = parseInt(videoFile.duration);
    
//owner
    const user = req.user._id
    if (!user) {
        throw new ApiError("unable to find user")
    }

    const video = await Video.create({
      title,
      description,
      thumbnail: thumbnail.url,
      videoFile: videoFile.url,
      duration,
      owner: user,
      isPublished: true
    });

    if (!video) {
      throw new ApiError(500 , "Unable to publish video")
    }
    
  return res
  .status(200)
  .json(new ApiResponse(200 , video , "video upload successful"))
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const userId = req.user?._id

    // const videoExists = await Video.findOne();
    const videoExists = await Video.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(videoId),
          isPublished: true,
        },
      },
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
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "video",
          as: "likes",
        },
      },
      {
        $addFields: {
          owner: {
            $first: "$owner",
          },
          likes: {
            $size: "$likes",
          },
        },
      },
    ]);
    if (!videoExists) {
      throw new ApiError(400, "Video does not exist or is not published");
    }
    const isLiked = await Like.find({
      likedBy: userId,
      video: new mongoose.Types.ObjectId(videoId),
    });

  const isVideoWatched = req.user?.watchHistory.includes(videoId)
    await User.findByIdAndUpdate(userId, {  
      $addToSet: { watchHistory: videoId },
    } , {new:true});

    let video;
    if (!isVideoWatched) {
      video = await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } } , {new: true});
      console.log("if ran")
    }else{ video = videoExists
      console.log("else ran")
    }
    
     if (!video) {
        throw new ApiError(400 , "video doesnot exist")
     }
     return res
       .status(200)
       .json(
         new ApiResponse(
           201,
           [ ...video, {isLiked} ],
           "Video fetched successfull and user watch history updated"
         )
       );
})

//allow only owner to update, delete video and toggle isPublished
const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const {title , description} = req.body
    const userId = req.user._id
    if (!title || ! description) {
        throw new ApiError(400 , "All fields are required")
    }
     const oldVideo = await Video.findById(videoId);
     if (!oldVideo) {
       throw new ApiError(404, "Video not found");
     }
     if (oldVideo.owner.toString() !== userId.toString()) {
       throw new ApiError(403, "You are not authorized to update this video");
     }
    const newTHumbnailLocalFIle = req.file?.path;
    if (!newTHumbnailLocalFIle) {
        throw new ApiError(400 , "thumbnail is required")
    }  
    const newTHumbnail = await uploadOnCloudinary(newTHumbnailLocalFIle)
    // console.log(newTHumbnail)
    if (!newTHumbnail) {
        throw new ApiError(404 , " Failed to upload thumbnail")
    }
    const oldThumbnail = oldVideo.thumbnail
    const publicId = oldThumbnail.split("/").pop().split(".")[0];
    cloudinary.api
      .delete_resources([publicId], {
        type: "upload",
        resource_type: "image",
      })
      .then(console.log);

    const video = await Video.findByIdAndUpdate(videoId, {
      $set: {
        title,
        description,
        thumbnail: newTHumbnail?.url,
      },
    } , {new: true});

    if (!video) {
        throw new ApiError(400 , "Video not found")
    }
    return res.status(200).json(new ApiResponse(200 , video , "VIdeo details updated successfully"))
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const userId = req.user._id
    const video = await Video.findOneAndDelete({
      _id: videoId,
      owner: userId,
    });

    if (!video) {
      throw new ApiError(
        400,
        "Video does not exist or you are not authorized to delete it"
      );
    }
    const video_thumbnail = video.thumbnail
    const video_videoFile = video.videoFile
    const publicIdforThumbnail = video_thumbnail.split("/").pop().split(".")[0];
    const publicIdforVideo = video_videoFile.split("/").pop().split(".")[0];

    cloudinary.api
      .delete_resources([publicIdforThumbnail], {
        type: "upload",
        resource_type: "image",
      })
      .then(console.log);
      cloudinary.api
        .delete_resources([publicIdforVideo], {
          type: "upload",
          resource_type: "video",
        })
        .then(console.log);
     return res
       .status(200)
       .json(new ApiResponse(201, video, "Video delete successfull"));
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const userId = req.user._id
    const video = await Video.findOne({ _id: videoId, owner: userId });

    if (!video) {
        throw new ApiError(400 , "video doesnot exist or you are not authorized to modify it")
    }
     video.isPublished = !video.isPublished
    await video.save();
    return res
    .status(200)
    .json( new ApiResponse(200 , video , "published field toggled successfully"))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
