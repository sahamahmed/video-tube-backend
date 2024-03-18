import {Tweet} from "../models/tweet.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    const {content} = req.body
    if (!content) {
        throw new ApiError(400 , "content is required")
    }
    const owner = req.user._id
    if (!owner) {
        throw new ApiError(400 , "failed to load owner")
    }
    const tweet = await Tweet.create( {
        content,
        owner
    })

    return res
    .status(200)
    .json(new ApiResponse(201 , tweet , "tweet successfully created"))
})  

const getUserTweets = asyncHandler(async (req, res) => {
    const {userId} = req.params
    
    const tweet = await Tweet.aggregate([
      {
        $match: {
          owner: new mongoose.Types.ObjectId(userId),
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
        $addFields: {
          owner: {
            $first: "$owner",
          },
        },
      },
    ]);
    return res
      .status(200)
      .json(new ApiResponse(201, tweet, "tweets successfully fetched"));   
})

const updateTweet = asyncHandler(async (req, res) => {
    const {content} = req.body
    const {tweetId} = req.params
    const tweet = await Tweet.findByIdAndUpdate(tweetId , {
        $set: {
            content
        }
    } , {new: true})

    return res
      .status(200)
      .json(new ApiResponse(201, tweet, "tweet successfully updated"));
})

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    await Tweet.findByIdAndDelete(tweetId)

     return res
       .status(200)
       .json(new ApiResponse(201, {}, "tweet deleted"));
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}
