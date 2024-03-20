import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => { 
    const {name, description} = req.body
    const userId = req.user?._id

    if (!name || !description) {
        throw new Error(400 , "name and description is required")
    }

    const playlist = await Playlist.create(
        { name,
        description,
        owner: userId,
        }
    )   

   return res
   .status(201)
   .json( new ApiResponse(201 , playlist , "Playlist created successfully"))
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    if (!userId) {
        throw new ApiError(400 , " userId not provided")
    }

    const playlists = await Playlist.find({owner: userId})
    if (!playlists) {
        throw new ApiError(404 , " unable to find playlist")
    }
     return res
   .status(200)
   .json( new ApiResponse(200 , playlists , `Playlists for ${req.user.username} fetched successfully`))
    
})

//only those videos will be displayed that are Published
const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    if (!playlistId) {
      throw new ApiError(400, " playlist Id not provided");
    }

    const playlist = await Playlist.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(playlistId),
        },
      },
      {
        $lookup: {
          from: "videos",
          localField: "videos",
          foreignField: "_id",
          as: "videos",
          pipeline: [
            {
              $match: {
                isPublished: true, // Filter videos by isPublished field
              },
            },
            {
              $project: {
                title: 1,
                thumbnail: 1,
                videoFile: 1,
                duration: 1,
                views: 1,
              },
            },
          ],
        },
      },
    ]);
    if (!playlist) {
      throw new ApiError(404, " unable to find playlist");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, playlist, "Playlist fetched successfully"));
})  

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    const userId = req.user?._id

    if (!playlistId || !videoId) {
        throw new ApiError(400 , "playlistId and videoId are required")
    }
     const playlist = await Playlist.findOneAndUpdate(
       { _id: playlistId, owner: userId }, 
       { $push: { videos: videoId } },
       { new: true }
     );
    if (!playlist) {
      throw new ApiError(404, "Playlist not found or you do not have access do add video to playlist");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, playlist, "Video added to playlist successfully"));
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    const userId = req.user?._id

    if (!playlistId || !videoId) {
        throw new ApiError(400 , "playlistId and videoId are required")
    }
     const playlist = await Playlist.findOneAndUpdate(
       { _id: playlistId, owner: userId }, 
       { $pull: { videos: videoId } },
       { new: true }
     );
    if (!playlist) {
      throw new ApiError(404, "Playlist not found or you do not have access to delete video from playlist");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, playlist, "Video removed from playlist successfully"));

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const userId = req.user?._id

    if (!playlistId) {
        throw new ApiError(404 , "PlaylistId is required")
    }
    const playlist = await Playlist.findOneAndDelete({ _id: playlistId, owner: userId });
    if (!playlist) {
      throw new ApiError(
        404,
        "Playlist not found or you do not have access to delete video from playlist"
      );
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, playlist, "Playlist deleted successfully")
      );

})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    const userId = req.user?._id
    if (!name || !description) {
        throw new ApiError(400 , " name and description fields are required")
    }

    if (!playlistId) {
        throw new ApiError(404 , "PlaylistId is required")
    }
    const playlist = await Playlist.findOneAndUpdate(
      { _id: playlistId, owner: userId },
      { name: name, description: description },
      { new: true }
    );  

    if (!playlist) {
      throw new ApiError(
        404,
        "Playlist not found or you do not have access to update playlist"
      );
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, playlist, "Playlist updated successfully")
      );

})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist, 
    deletePlaylist,
    updatePlaylist
}
