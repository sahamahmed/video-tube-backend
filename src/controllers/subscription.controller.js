import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
 

const toggleSubscription = asyncHandler(async (req, res) => {  
    const {channelId} = req.params
    const subscriberId = req.user._id
    let subscriptionstatus = ""
    // TODO: toggle subscription
    const subscribed = await Subscription.findOne({subscriber: subscriberId , channel: channelId})
    if(subscribed){
        await Subscription.findByIdAndDelete(subscribed._id)
        subscriptionstatus = "unsubscribed"
        console.log("if ran")
    }else{
        await Subscription.create({
          subscriber: subscriberId,
          channel: channelId,
        });
        subscriptionstatus = "subscribed"
        console.log("else ran")
    }
    return res.status(200).json( new ApiResponse(200 , subscriptionstatus, "subscription toggled successfully"))
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    const subscriberList = await Subscription.aggregate([
      { $match: { channel: new mongoose.Types.ObjectId(channelId) } },
      { $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriber",
        pipeline: [
            {
                $project: {
                    username: 1,
                    fullName: 1,
                    avatar: 1
                }
            }
        ]
      }},
      {
        $addFields: {
            subscriber : {
                $first: "$subscriber"
            }
        }
      }
      
    ]);

    return res
    .status(200)
    .json(new ApiResponse(200 , subscriberList , "subscriber list of this channel fetched successfully"))

})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
    const mySubscribedChannels = await Subscription.aggregate([
      { $match: { subscriber: new mongoose.Types.ObjectId(subscriberId) } },
      {
        $lookup: {
          from: "users",
          localField: "channel",
          foreignField: "_id",
          as: "channel",
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
          channel: {
            $first: "$channel",
          },
        },
      },
    ]);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
            mySubscribedChannels,
          "list of channels to whom you have subscribed fetched successfully"
        )
      );

})

export {
    toggleSubscription,    
    getUserChannelSubscribers,
    getSubscribedChannels
}