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
  ConfigProvider,
  theme,
} from 'antd';
import {
  AppstoreOutlined,
  UnorderedListOutlined,
  PlusOutlined,
  SearchOutlined,
  UserOutlined,
  LogoutOutlined,
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
  getItem('Dashboard', '/dashboard', <AppstoreOutlined />),
  getItem('Game List', '/games', <UnorderedListOutlined />),
  getItem('Kanban Board', '/board', <AppstoreOutlined />),
  getItem('Add Game', '/add-game', <PlusOutlined />),
];

const bottomMenuItems: MenuItem[] = [
  getItem('Profile', '/profile', <UserOutlined />),
];

interface AppLayoutProps {
  user: User;
  onLogout: () => void;
  children: React.ReactNode;
}

// Custom dark theme tokens
const darkTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#7B61FF',
    colorBgContainer: 'rgba(255, 255, 255, 0.03)',
    colorBgElevated: 'rgba(30, 30, 50, 0.95)',
    colorBorder: 'rgba(255, 255, 255, 0.08)',
    colorText: 'rgba(255, 255, 255, 0.95)',
    colorTextSecondary: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 12,
  },
  components: {
    Layout: {
      siderBg: 'rgba(15, 15, 35, 0.98)',
      headerBg: 'rgba(15, 15, 35, 0.98)',
      bodyBg: 'transparent',
    },
    Menu: {
      darkItemBg: 'transparent',
      darkItemSelectedBg: 'rgba(123, 97, 255, 0.2)',
      darkItemHoverBg: 'rgba(255, 255, 255, 0.05)',
      darkItemColor: 'rgba(255, 255, 255, 0.7)',
      darkItemSelectedColor: '#7B61FF',
    },
    Input: {
      colorBgContainer: 'rgba(255, 255, 255, 0.05)',
      colorBorder: 'rgba(255, 255, 255, 0.1)',
    },
    Button: {
      colorBgContainer: 'rgba(255, 255, 255, 0.05)',
    },
  },
};

const AppLayout: React.FC<AppLayoutProps> = ({ user, onLogout, children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOptions, setSearchOptions] = useState<
    { label: React.ReactNode; value: string; game?: Game }[]
  >([]);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMenuClick: MenuProps['onClick'] = e => {
    navigate(e.key);
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
                  <div style={{ fontWeight: 'bold', color: 'rgba(255,255,255,0.95)' }}>{game.name}</div>
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
    <ConfigProvider theme={darkTheme}>
      <Layout style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)' }}>
        <Sider
          width={220}
          style={{
            background: 'rgba(15, 15, 35, 0.95)',
            borderRight: '1px solid rgba(255, 255, 255, 0.06)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div
            style={{
              height: '64px',
              display: 'flex',
              alignItems: 'center',
              paddingLeft: '24px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #fff 0%, #7B61FF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              GameBacklog
            </h2>
          </div>
          <Menu
            onClick={handleMenuClick}
            selectedKeys={[location.pathname]}
            mode='inline'
            items={mainMenuItems}
            theme='dark'
            style={{
              background: 'transparent',
              borderRight: 'none',
              marginTop: '16px',
            }}
          />
          <div style={{ flex: 1 }} />
          <Menu
            onClick={handleMenuClick}
            selectedKeys={[location.pathname]}
            mode='inline'
            items={bottomMenuItems}
            theme='dark'
            style={{
              background: 'transparent',
              borderRight: 'none',
              marginTop: 'auto',
            }}
          />
        </Sider>
        <Layout style={{ background: 'transparent' }}>
          <Header
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0 24px',
              background: 'rgba(15, 15, 35, 0.6)',
              backdropFilter: 'blur(20px)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div style={{ flex: 1 }} />
            <div style={{ flex: 2, display: 'flex', justifyContent: 'center' }}>
              <AutoComplete
                options={searchOptions}
                onSearch={handleSearch}
                onSelect={handleSelect}
                style={{ width: '100%', maxWidth: '500px' }}
              >
                <Input
                  prefix={<SearchOutlined style={{ color: 'rgba(255,255,255,0.4)' }} />}
                  placeholder='Search games...'
                  size='middle'
                  allowClear
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                  }}
                />
              </AutoComplete>
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
                    height: '40px',
                    padding: '4px 12px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <Space>
                    <Avatar src={user.avatar_url} size='small' />
                    <span style={{ color: 'rgba(255,255,255,0.9)' }}>
                      {user.display_name}
                    </span>
                  </Space>
                </Button>
              </Dropdown>
            </div>
          </Header>
          <Content style={{ margin: 0, overflow: 'auto' }}>{children}</Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};

export default AppLayout;
