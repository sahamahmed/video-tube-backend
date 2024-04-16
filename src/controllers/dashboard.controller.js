import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

const getChannelStats = asyncHandler(async (req, res) => {
  const {userId} = req.params;
  const Allvideos = await Video.find({ owner: userId });
  const stats = {};
  if (!Allvideos) {
    throw new ApiError(400, "unable to find videos");
  }

  stats.ownerInfo = await User.findById(userId)

  //1.Total video views 
  let totalViews = 0;
  Allvideos.forEach((video) => {
    totalViews += video.views;
  });
  stats.TotalViews = totalViews;

  //2.Total videos
  stats.NumberOfVideos = Allvideos.length;

  //3.Total subscribers
  stats.NumberOfSubscribers = await Subscription.countDocuments({
    channel: userId,
  });

  //4.Total likes
  let totalLikes = await Like.aggregate([
    {
      $match: {
        video: { $in: Allvideos.map((video) => video._id) },
      },
    },
    { 
        $group: { 
            _id: null, 
            totalLikes: { 
                $sum: 1 
            } 
        } 
    },
    {
         $project: {
             _id: 0,
              totalLikes: 1
             }
         },
  ]);
  if (!totalLikes[0]) {
    stats.NumberOfLikes = {
      totalLikes: 0,
    };
  }else{
stats.NumberOfLikes = totalLikes[0] 
 }

  //final response
  return res
    .status(200)
    .json(new ApiResponse(200, stats, "All videos fetched successfully"));
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const {userId} = req.params;
  const Allvideos = await Video.find({ owner: userId });
  if (!Allvideos) {
    throw new ApiError(400, "unable to find videos");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, Allvideos, "All videos fetched successfully"));
});

export { getChannelStats, getChannelVideos };
