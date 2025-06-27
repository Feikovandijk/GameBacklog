import React from 'react';
import { Layout, Menu, Avatar, Input, Button } from 'antd';
import {
  AppstoreOutlined,
  UnorderedListOutlined,
  PlusOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import type { User } from '../services/api';
import { useLocation, useNavigate } from 'react-router-dom';

const { Header, Content, Sider } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
  children?: MenuItem[],
): MenuItem {
  return { key, icon, children, label } as MenuItem;
}

const mainMenuItems: MenuItem[] = [
  getItem('Dashboard', '/dashboard', <AppstoreOutlined />),
  getItem('Game List', '/games', <UnorderedListOutlined />),
  getItem('Kanban Board', '/board', <AppstoreOutlined />),
  getItem('Add Game', '/add-game', <PlusOutlined />),
];

const bottomMenuItems: MenuItem[] = [
    getItem('Profile', '/profile', <UserOutlined />),
]

interface AppLayoutProps {
  user: User;
  onLogout: () => void;
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ user, onLogout, children }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleMenuClick: MenuProps['onClick'] = (e) => {
        navigate(e.key);
    };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        width={250} 
        style={{ 
            background: '#fff',
            borderRight: '1px solid #f0f0f0',
            display: 'flex',
            flexDirection: 'column'
        }}
      >
        <div style={{ height: '64px' }}>
            {/* This div is to align the menu with the content part, as header has 64px height */}
        </div>
        <Menu 
            onClick={handleMenuClick}
            selectedKeys={[location.pathname]}
            mode="inline" 
            items={mainMenuItems} 
            style={{ flexGrow: 1, borderRight: 'none' }}
        />
         <Menu
            onClick={handleMenuClick}
            selectedKeys={[location.pathname]}
            mode="inline"
            items={bottomMenuItems}
            style={{ borderRight: 'none' }}
        />
      </Sider>
      <Layout style={{ backgroundColor: '#F7F8FA' }}>
        <Header style={{ 
          display: 'flex', 
          alignItems: 'center',
          padding: '0 24px',
          background: '#fff',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>GameBacklog</h1>
          </div>
          <div style={{ flex: 2, display: 'flex', justifyContent: 'center' }}>
            <Input 
              placeholder="Search games..." 
              prefix={<SearchOutlined />}
              style={{ width: '100%', maxWidth: '600px' }} 
            />
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <Avatar src={user.avatar_url} />
          </div>
        </Header>
        <Content style={{ padding: '48px', margin: 0 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
