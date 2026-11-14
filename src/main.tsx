import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import KiloRadarApp from './components/KiloRadarApp';
import type { CountryRouteCode } from './locales';
import './index.css';

function RoutedKiloRadar({ code }: { code: CountryRouteCode }) {
  const navigate = useNavigate();
  return (
    <KiloRadarApp
      initialCountryCode={code}
      onNavigateCountry={(_nextCode, targetPath) => {
        navigate(targetPath);
      }}
    />
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RoutedKiloRadar code="en" />} />
        <Route path="/no" element={<RoutedKiloRadar code="no" />} />
        <Route path="/se" element={<RoutedKiloRadar code="se" />} />
        <Route path="/dk" element={<RoutedKiloRadar code="dk" />} />
        <Route path="/pl" element={<RoutedKiloRadar code="pl" />} />
        <Route path="*" element={<RoutedKiloRadar code="en" />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
