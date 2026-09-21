import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { PlaceholderPage } from "./pages/PlaceholderPage";

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<PlaceholderPage title="Open House" />} />
        <Route path="schedule" element={<PlaceholderPage title="Schedule" />} />
        <Route path="booths" element={<PlaceholderPage title="Booths" />} />
        <Route path="map" element={<PlaceholderPage title="Map" />} />
        <Route path="passport" element={<PlaceholderPage title="Passport" />} />
        <Route path="student-groups" element={<PlaceholderPage title="Student Groups" />} />
        <Route path="faq" element={<PlaceholderPage title="FAQ" />} />
        <Route path="help" element={<PlaceholderPage title="Help" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
