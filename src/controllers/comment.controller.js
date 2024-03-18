import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  let { page = 1, limit = 10 } = req.query;
  page = parseInt(page);
  limit = parseInt(limit);

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  const results = {};

  results.totalCount = await Comment.countDocuments({ video: videoId });

  if (endIndex < results.totalCount) {
    results.next = {
      page: page + 1,
    };
  }

  if (startIndex > 0) {
    results.previous = {
      page: page - 1,
    };
  }

  results.comments = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
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
  ]);
  if (!results.comments) {
    throw new ApiError(404, "no comments for this video");
  }

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

const updateComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { commentId } = req.params;

  if (!content) {
    throw new ApiError(400, "Content is a required field");
  }
  const comment = await Comment.findByIdAndUpdate(
    commentId,
    {
      content,
    },
    { new: true }
  );

  if (!comment) {
    throw new ApiError("comment does not exist");
  }
  return res
    .status(201)
    .json(new ApiResponse(201, comment, "comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    // I thought that delete rights should only be given when user is the owner to prevent non-owners from deleting anyones comment
    const { commentId } = req.params;
    const userId = req.user._id;
    const comment = await Comment.findOne({ _id: commentId, owner: userId });

    if (!comment) {
        throw new ApiError(404, "Comment does not exist or you do not have permission to delete it");
    }

    await Comment.findByIdAndDelete(commentId);

    return res.status(200).json(new ApiResponse(200 , {} , "comment delete successful"));
});


 

export { getVideoComments, addComment, updateComment, deleteComment };
