import React from 'react';
import { Button, Tooltip } from 'antd';
import { SunOutlined, MoonOutlined } from '@ant-design/icons';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Tooltip title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'} placement="left">
      <Button
        type="text"
        shape="circle"
        size="large"
        onClick={toggleTheme}
        className="theme-toggle-btn"
      >
        {theme === 'light' ? <MoonOutlined /> : <SunOutlined />}
      </Button>
    </Tooltip>
  );
};

export default ThemeToggle;
