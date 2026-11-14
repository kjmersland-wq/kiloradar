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
        <Route path="/us/*" element={<RoutedKiloRadar code="us" />} />
        <Route path="/uk/*" element={<RoutedKiloRadar code="uk" />} />
        <Route path="/no/*" element={<RoutedKiloRadar code="no" />} />
        <Route path="/sv/*" element={<RoutedKiloRadar code="se" />} />
        <Route path="/se/*" element={<RoutedKiloRadar code="se" />} />
        <Route path="/da/*" element={<RoutedKiloRadar code="dk" />} />
        <Route path="/dk/*" element={<RoutedKiloRadar code="dk" />} />
        <Route path="/pl/*" element={<RoutedKiloRadar code="pl" />} />
        <Route path="/de/*" element={<RoutedKiloRadar code="de" />} />
        <Route path="/fr/*" element={<RoutedKiloRadar code="fr" />} />
        <Route path="/es/*" element={<RoutedKiloRadar code="es" />} />
        <Route path="*" element={<RoutedKiloRadar code="en" />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
