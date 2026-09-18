import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Object Royale",
    short_name: "Obj Royale",
    description: "Photograph your surroundings. AI turns everyday objects into fighters. You make them battle.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#eee6d3",
    theme_color: "#eee6d3",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
