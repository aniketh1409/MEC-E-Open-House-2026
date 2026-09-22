import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { BoothDetailPage } from "./pages/Booth/BoothDetailPage";
import { BoothDirectoryPage } from "./pages/Booth/BoothDirectoryPage";
import { PlaceholderPage } from "./pages/Booth/PlaceholderPage";
import { HomePage } from "./pages/Home/HomePage";
import { HelpPage } from "./pages/Help/HelpPage";

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="schedule" element={<PlaceholderPage title="Schedule" />} />
        <Route path="booths" element={<BoothDirectoryPage />} />
        <Route path="booths/:boothId" element={<BoothDetailPage />} />
        <Route path="map" element={<PlaceholderPage title="Map" />} />
        <Route path="passport" element={<PlaceholderPage title="Passport" />} />
        <Route path="student-groups" element={<PlaceholderPage title="Student Groups" />} />
        <Route path="faq" element={<PlaceholderPage title="FAQ" />} />
        <Route path="help" element={<HelpPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
