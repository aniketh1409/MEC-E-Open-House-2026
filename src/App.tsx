import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { BoothDetailPage } from "./pages/BoothDetailPage";
import { BoothDirectoryPage } from "./pages/BoothDirectoryPage";
import { CollectStampPage } from "./pages/CollectStampPage";
import { PassportPage } from "./pages/PassportPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { QrCodeSheetPage } from "./pages/QrCodeSheetPage";
import { ScanQrPage } from "./pages/ScanQrPage";

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<PlaceholderPage title="Open House" />} />
        <Route path="schedule" element={<PlaceholderPage title="Schedule" />} />
        <Route path="booths" element={<BoothDirectoryPage />} />
        <Route path="booths/:boothId" element={<BoothDetailPage />} />
        <Route path="map" element={<PlaceholderPage title="Map" />} />
        <Route path="passport" element={<PassportPage />} />
        <Route path="passport/scan" element={<ScanQrPage />} />
        <Route path="passport/collect/:qrCode" element={<CollectStampPage />} />
        <Route path="qr-codes" element={<QrCodeSheetPage />} />
        <Route path="student-groups" element={<PlaceholderPage title="Student Groups" />} />
        <Route path="faq" element={<PlaceholderPage title="FAQ" />} />
        <Route path="help" element={<PlaceholderPage title="Help" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
