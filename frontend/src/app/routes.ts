import { createBrowserRouter } from "react-router";
import Landing from "./screens/Landing";
import PreGame from "./screens/PreGame";
import Gameplay from "./screens/Gameplay";
import GameOver from "./screens/GameOver";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Landing,
  },
  {
    path: "/setup",
    Component: PreGame,
  },
  {
    path: "/play",
    Component: Gameplay,
  },
  {
    path: "/game-over",
    Component: GameOver,
  },
]);
