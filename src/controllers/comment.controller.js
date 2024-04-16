import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Like } from "../models/like.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  let { page = 1, limit = 5 } = req.query;
  page = parseInt(page);
  limit = parseInt(limit);

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  const results = {};

  results.totalCount = await Comment.countDocuments({ video: videoId });

  results.comments = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $sort: {
        createdAt: -1
      }
    },
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
              username: 1,
              fullName: 1,
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
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "comment",
        as: "likes",
      },
    },
    {
      $project: {
        content: 1,
        owner: 1,
        likeCount: { $size: "$likes"},
        createdAt: 1,
        updatedAt: 1
      }
    },
    
  ]);
  if (!results.comments) {
    throw new ApiError(404, "no comments for this video");
  }


  results.MyLikedComments = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req?.user?._id),
        comment: { $in: results.comments.map((comment) => comment._id) },
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, results, "All comments for this video fetched"));
});

const addComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { videoId } = req.params;
  const userId = req.user._id;

  if (!content) {
    throw new ApiError(400, "Content is a required field");
  }

  const comment = await Comment.create({
    content,
    video: videoId,
    owner: userId,
  });
  if (!comment) {
    throw new ApiError(500, "unable to create comment");
  }
  return res
    .status(201)
    .json(new ApiResponse(201, comment, "comment created successfully"));
});

// only allow owner to update
const updateComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { commentId } = req.params;
  const userId = req.user._id;

  if (!content) {
    throw new ApiError(400, "Content is a required field");
  }
  const comment = await Comment.findOneAndUpdate(
    { _id: commentId, owner: userId },
    {
      content,  
    },
    { new: true }
  );

  if (!comment) {
    throw new ApiError(
      404,
      "comment does not exist or you donot have permission to update it"
    );
  }
  return res
    .status(201)
    .json(new ApiResponse(201, comment, "comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  // delete rights should only be given when user is the owner to prevent non-owners from deleting anyones comment
  const { commentId } = req.params;
  const userId = req.user._id;
  const comment = await Comment.findOneAndDelete({
    _id: commentId,
    owner: userId,
  });

  if (!comment) {
    throw new ApiError(
      404,
      "Comment does not exist or you do not have permission to delete it"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "comment delete successful"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
