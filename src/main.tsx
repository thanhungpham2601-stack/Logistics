import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import {ConfigProvider} from 'antd';
import viVN from 'antd/locale/vi_VN';
import App from './App.tsx';
import './index.css';
import { applyTheme, getStoredTheme } from './lib/theme';

// Áp theme đã lưu (nếu có) trước khi vẽ trang đầu tiên - tránh nháy màu mặc định rồi mới đổi.
applyTheme(getStoredTheme());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      locale={viVN}
      theme={{
        token: {
          colorPrimary: '#2563eb',
          borderRadius: 8,
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        },
      }}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  </StrictMode>,
);
