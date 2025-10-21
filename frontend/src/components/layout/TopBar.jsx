import React from 'react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Menu } from 'lucide-react';

const TopBar = ({ onMenuClick }) => {
  const { user } = useAuth();

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4">
      <div className="flex items-center">
        <span className="text-lg font-bold text-blue-600">AI-HRMS</span>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
          {user?.name?.charAt(0)?.toUpperCase()}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onMenuClick}
        >
          <Menu className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};

export default TopBar;