import React, { useState, useRef } from 'react';
import {
  Layout,
  Menu,
  Avatar,
  AutoComplete,
  Button,
  Typography,
  message,
  Space,
  Input,
  Dropdown,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  UserOutlined,
  LogoutOutlined,
  DashboardOutlined,
  BookOutlined,
  SettingOutlined,
  SyncOutlined,
  DownOutlined,
  LayoutOutlined,
  ContainerOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import type { User, Game } from '../services/api';
import { useLocation, useNavigate } from 'react-router-dom';
import { gamesAPI, userGamesAPI } from '../services/api';

const { Text } = Typography;

const { Header, Content, Sider } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
  children?: MenuItem[]
): MenuItem {
  return { key, icon, children, label } as MenuItem;
}

const mainMenuItems: MenuItem[] = [
  getItem('Dashboard', '/dashboard', <DashboardOutlined />, [
    getItem('Overview', '/dashboard'),
    getItem('Notes', '/dashboard/notes'),
    getItem('Tags', '/dashboard/tags'),
  ]),
  getItem('Workspace', '/workspace', <LayoutOutlined />),
  getItem('Backlog', '/backlog', <ContainerOutlined />),
  getItem('Game Library', '/games', <BookOutlined />),
];

const bottomMenuItems: MenuItem[] = [
  getItem('Settings', '/settings', <SettingOutlined />),
];

interface AppLayoutProps {
  user: User;
  onLogout: () => void;
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ user, onLogout, children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOptions, setSearchOptions] = useState<
    { label: React.ReactNode; value: string; game?: Game }[]
  >([]);
  const [openKeys, setOpenKeys] = useState<string[]>(['/dashboard']);
  const [isSyncing, setIsSyncing] = useState(false);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMenuClick: MenuProps['onClick'] = e => {
    // Handle navigation for both parent and child menu items
    navigate(e.key);
  };

  const handleOpenChange = (keys: string[]) => {
    setOpenKeys(keys);
  };

  // Determine selected keys based on current path
  const getSelectedKeys = () => {
    const path = location.pathname;
    // If on dashboard, select dashboard
    if (path === '/dashboard') {
      return ['/dashboard'];
    }
    // For other paths, return the exact path
    return [path];
  };

  const handleSearch = async (value: string) => {
    if (!value.trim()) {
      setSearchOptions([]);
      return;
    }

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set a delay for search to avoid too many API calls
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await gamesAPI.searchGames(value, 5);
        const options = response.data.map((game: Game) => ({
          value: game.name,
          label: (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Space>
                <Avatar src={game.header_image} shape='square' size='small' />
                <div>
                  <div style={{ fontWeight: 'bold' }}>{game.name}</div>
                  <Text type='secondary' style={{ fontSize: '12px' }}>
                    {game.developers?.join(', ')}
                  </Text>
                </div>
              </Space>
              <Button
                type='link'
                size='small'
                icon={<PlusOutlined />}
                onClick={e => {
                  e.stopPropagation();
                  handleQuickAdd(game);
                }}
              >
                Add
              </Button>
            </div>
          ),
          game: game,
        }));
        setSearchOptions(options);
      } catch (error) {
        console.error('Search error:', error);
        setSearchOptions([]);
      }
    }, 300);
  };

  const handleQuickAdd = async (game: Game) => {
    try {
      await userGamesAPI.addGame({
        steam_appid: game.steam_appid,
        status: 'want_to_play',
        priority: 1,
      });
      message.success(`${game.name} added to your backlog!`);
      setSearchOptions([]); // Clear search results
    } catch (error) {
      console.error('Error adding game:', error);
      message.error(
        `Failed to add ${game.name}. It might already be in your backlog.`
      );
    }
  };

  const handleSelect = () => {
    // Clear search results when selecting
    setSearchOptions([]);
  };

  const handleSyncGames = async () => {
    setIsSyncing(true);
    message.info('Starting Steam library sync. This may take a moment...');
    try {
      await userGamesAPI.syncUserGames();
      message.success('Your Steam library has been synced successfully!');
    } catch (error) {
      console.error('Error syncing games:', error);
      message.error('Failed to sync your Steam library. Please try again later.');
    } finally {
      setIsSyncing(false);
    }
  };

  const userMenuItems = [
    {
      key: 'profile',
      label: 'Profile',
      icon: <UserOutlined />,
      onClick: () => navigate('/profile'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      label: 'Logout',
      icon: <LogoutOutlined />,
      onClick: onLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--primary-bg)' }}>
      <Sider
        width={280}
        style={{
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          height: '100vh',
          left: 0,
          top: 0,
          overflow: 'hidden',
        }}
      >
        {/* Logo Section */}
        <div 
          style={{ 
            padding: '24px 20px', 
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: 'var(--accent-gradient)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <BookOutlined style={{ color: '#ffffff', fontSize: '16px' }} />
            </div>
            <h1 style={{ 
              margin: 0, 
              fontSize: '20px', 
              fontWeight: 'bold',
              color: 'var(--text-primary)',
            }}>
              GameBacklog
            </h1>
          </div>
        </div>

        {/* Navigation Menu */}
        <div style={{ flex: 1, padding: '16px 12px', overflow: 'auto' }}>
          <Menu
            onClick={handleMenuClick}
            selectedKeys={getSelectedKeys()}
            openKeys={openKeys}
            onOpenChange={handleOpenChange}
            mode='inline'
            items={mainMenuItems}
            style={{ 
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        {/* Bottom Section */}
        <div style={{ 
          padding: '12px',
          borderTop: '1px solid var(--border-color)',
        }}>
          <Menu
            onClick={handleMenuClick}
            selectedKeys={getSelectedKeys()}
            mode='inline'
            items={bottomMenuItems}
            style={{ 
              background: 'transparent',
              border: 'none',
              marginBottom: '16px',
            }}
          />
          
          {/* User Profile Section */}
          <div style={{
            padding: '16px',
            background: 'var(--card-bg)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              marginBottom: '12px',
            }}>
              <Avatar src={user.avatar_url} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  color: 'var(--text-primary)',
                  fontWeight: '600',
                  fontSize: '14px',
                  marginBottom: '2px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {user.display_name}
                </div>
                <div style={{ 
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                }}>
                  Account settings
                </div>
              </div>
              <DownOutlined style={{ color: 'var(--text-secondary)', fontSize: '12px' }} />
            </div>
            
            {/* Sync Games Button */}
            <Button
              type="primary"
              block
              size="middle"
              icon={<SyncOutlined spin={isSyncing} />}
              style={{
                background: 'var(--accent-gradient)',
                border: 'none',
                height: '36px',
                fontWeight: '600',
                borderRadius: '8px',
              }}
              onClick={handleSyncGames}
              disabled={isSyncing}
            >
              {isSyncing ? 'Syncing...' : 'Sync Games'}
            </Button>
          </div>
        </div>
      </Sider>
      
      <Layout style={{ 
        marginLeft: '280px', 
        background: 'var(--primary-bg)',
        minHeight: '100vh',
      }}>
        <Header
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px',
            background: 'var(--primary-bg)',
            borderBottom: '1px solid var(--border-color)',
            height: '80px',
          }}
        >
          <div style={{ flex: 1 }}>
            {/* Page title or breadcrumb could go here */}
          </div>
          <div style={{ flex: 2, display: 'flex', justifyContent: 'center' }}>
            <AutoComplete
              options={searchOptions}
              onSearch={handleSearch}
              onSelect={handleSelect}
              style={{ width: '100%', maxWidth: '600px' }}
              getInputElement={() => (
                <Input
                  prefix={<SearchOutlined style={{ color: 'var(--text-secondary)' }} />}
                  placeholder='Search games...'
                  size='large'
                  allowClear
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    color: 'var(--text-primary)',
                  }}
                />
              )}
            />
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <Dropdown
              menu={{ items: userMenuItems }}
              placement='bottomRight'
              trigger={['click']}
            >
              <Button
                type='text'
                style={{ 
                  height: '44px', 
                  padding: '4px 12px',
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                }}
              >
                <Space>
                  <Avatar src={user.avatar_url} size='small' />
                  <span style={{ color: 'var(--text-primary)' }}>{user.display_name}</span>
                </Space>
              </Button>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ 
          padding: '32px 48px', 
          margin: 0,
          background: 'var(--primary-bg)',
          color: 'var(--text-primary)',
        }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
