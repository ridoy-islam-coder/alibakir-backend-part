// // social.service.ts
// import axios from "axios";

// const YOUTUBE_API_KEY = "AIzaSyAMLTu3H38-hb9jnUREr28YNB5KeHI4eyA";

// export const getYoutubeChannelDataService = async (username: string) => {
//   // 1️⃣ username → channel info
//   const channelRes = await axios.get(
//     "https://www.googleapis.com/youtube/v3/channels",
//     {
//       params: {
//         part: "snippet,statistics,contentDetails",
//         forUsername: username,
//         key: YOUTUBE_API_KEY
//       }
//     }
//   );

//   const items = channelRes.data.items;

//   if (!items || items.length === 0) {
//     throw new Error("CHANNEL_NOT_FOUND");
//   }

//   const channel = items[0];

//   // safety check for contentDetails
//   if (!channel.contentDetails || !channel.contentDetails.relatedPlaylists) {
//     throw new Error("UPLOADS_PLAYLIST_NOT_FOUND");
//   }

//   const uploadsPlaylistId = channel.contentDetails.relatedPlaylists.uploads;

//   // 2️⃣ fetch channel videos
//   const videoRes = await axios.get(
//     "https://www.googleapis.com/youtube/v3/playlistItems",
//     {
//       params: {
//         part: "snippet",
//         playlistId: uploadsPlaylistId,
//         maxResults: 10,
//         key: YOUTUBE_API_KEY
//       }
//     }
//   );

//   const videoItems = videoRes.data.items || [];

//   return {
//     channel: {
//       id: channel.id,
//       title: channel.snippet?.title || "No title",
//       description: channel.snippet?.description || "",
//       subscribers: channel.statistics?.subscriberCount || "0",
//       views: channel.statistics?.viewCount || "0",
//       videos: channel.statistics?.videoCount || "0",
//       thumbnail: channel.snippet?.thumbnails?.high?.url || ""
//     },
//     videos: videoItems.map((item: any) => ({
//       videoId: item.snippet?.resourceId?.videoId || "",
//       title: item.snippet?.title || "No title",
//       thumbnail: item.snippet?.thumbnails?.high?.url || "",
//       publishedAt: item.snippet?.publishedAt || ""
//     }))
//   };
// };


// social.service.ts
import axios from "axios";

// keep the key in an environment variable, fallback to hard‑coded only for local testing
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "AIzaSyAMLTu3H38-hb9jnUREr28YNB5KeHI4eyA";

// helper: strip @ and whitespace, try to extract a channel ID when possible
function normalizeInput(input: string): string {
  let value = input.trim();
  // remove leading @ if present
  if (value.startsWith("@")) {
    value = value.slice(1);
  }
  // if the user pasted a full URL, pull out the last segment
  const urlMatch = value.match(/(?:youtube\.com\/(?:channel\/|user\/|@)?)([A-Za-z0-9_-]+)/i);
  if (urlMatch && urlMatch[1]) {
    value = urlMatch[1];
  }
  return value;
}

// simple pattern to detect a channel ID (usually starts with UC and is ~24 chars)
function looksLikeChannelId(str: string): boolean {
  return /^UC[a-zA-Z0-9_-]{22,}$/i.test(str);
}

export const getYoutubeChannelDataService = async (input: string) => {
  const clean = normalizeInput(input);
  let channelId: string | null = null;

  // if the cleaned input already *looks* like a channel id we can skip search
  if (looksLikeChannelId(clean)) {
    channelId = clean;
  } else {
    // first try the search endpoint
    console.log("youtube service search q=", clean);
    const searchRes = await axios.get("https://www.googleapis.com/youtube/v3/search", {
      params: {
        part: "snippet",
        q: clean,
        type: "channel",
        maxResults: 1,
        key: YOUTUBE_API_KEY
      }
    });

    console.log("youtube search response", JSON.stringify(searchRes.data, null, 2));
    const searchItems = searchRes.data.items;
    if (searchItems && searchItems.length > 0) {
      channelId = searchItems[0].snippet.channelId;
    }
  }

  if (!channelId) {
    // attempt an old-style username lookup via forUsername parameter
    console.log("youtube service trying forUsername lookup", clean);
    try {
      const usernameRes = await axios.get("https://www.googleapis.com/youtube/v3/channels", {
        params: {
          part: "id",
          forUsername: clean,
          key: YOUTUBE_API_KEY
        }
      });
      const usernameItems = usernameRes.data.items;
      if (usernameItems && usernameItems.length > 0) {
        channelId = usernameItems[0].id;
      }
    } catch (e) {
      // ignore - we'll handle not found below
    }
  }

  if (!channelId) {
    console.warn("youtube service no channel id from input", clean);
    const err: any = new Error("CHANNEL_NOT_FOUND");
    err.code = "CHANNEL_NOT_FOUND";
    throw err;
  }

  // fetch full channel details
  const channelRes = await axios.get("https://www.googleapis.com/youtube/v3/channels", {
    params: {
      part: "snippet,statistics,contentDetails",
      id: channelId,
      key: YOUTUBE_API_KEY
    }
  });

  const items = channelRes.data.items;
  if (!items || items.length === 0) {
    const err: any = new Error("CHANNEL_NOT_FOUND");
    err.code = "CHANNEL_NOT_FOUND";
    throw err;
  }

  const channel = items[0];
  const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) {
    const err: any = new Error("UPLOADS_PLAYLIST_NOT_FOUND");
    err.code = "UPLOADS_PLAYLIST_NOT_FOUND";
    throw err;
  }

  // fetch recent videos
  const videoRes = await axios.get("https://www.googleapis.com/youtube/v3/playlistItems", {
    params: {
      part: "snippet",
      playlistId: uploadsPlaylistId,
      maxResults: 10,
      key: YOUTUBE_API_KEY
    }
  });

  const videoItems = videoRes.data.items || [];

  return {
    channel: {
      id: channel.id,
      title: channel.snippet?.title || "No title",
      description: channel.snippet?.description || "",
      subscribers: channel.statistics?.subscriberCount || "0",
      views: channel.statistics?.viewCount || "0",
      videos: channel.statistics?.videoCount || "0",
      thumbnail: channel.snippet?.thumbnails?.high?.url || ""
    },
    videos: videoItems.map((item: any) => ({
      videoId: item.snippet?.resourceId?.videoId || "",
      title: item.snippet?.title || "No title",
      thumbnail: item.snippet?.thumbnails?.high?.url || "",
      publishedAt: item.snippet?.publishedAt || ""
    }))
  };
};