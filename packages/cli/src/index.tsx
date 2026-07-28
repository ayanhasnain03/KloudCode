import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import "opentui-spinner/react";
import { RootLayout } from "./layouts/root-layout";
import { createMemoryRouter, RouterProvider } from "react-router";
import { Session } from "./screens/session";
import { Home } from "./screens/home";
import { NewSession } from "./screens/new-session";
import { readLastSessionId } from "./lib/last-session";

const lastSessionId = readLastSessionId();
const initialEntries = lastSessionId
  ? [`/sessions/${lastSessionId}`]
  : ["/"];

const router = createMemoryRouter(
  [
    {
      path: "/",
      element: <RootLayout />,
      children: [
        { index: true, element: <Home /> },
        {
          path: "sessions/new",
          element: <NewSession />,
        },
        {
          path: "sessions/:id",
          element: <Session />,
        },
      ],
    },
  ],
  { initialEntries },
);

function App() {
  return <RouterProvider router={router} />;
}

const renderer = await createCliRenderer({
  targetFps: 60,
  exitOnCtrlC: false,
});

createRoot(renderer).render(<App />);
