import React, { useState, useRef } from 'react';
import { Layout, Menu, Avatar, AutoComplete, Button, Typography, message, Space, Input, Dropdown } from 'antd';
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
    const [searchOptions, setSearchOptions] = useState<{label: string; value: string}[]>([]);

    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleMenuClick: MenuProps['onClick'] = (e) => {
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
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Space>
                                <Avatar src={game.header_image} shape="square" size="small" />
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>{game.name}</div>
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                        {game.developers?.join(', ')}
                                    </Text>
                                </div>
                            </Space>
                            <Button
                                type="link"
                                size="small"
                                icon={<PlusOutlined />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickAdd(game);
                                }}
                            >
                                Add
                            </Button>
                        </div>
                    ),
                    game: game
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
            message.error(`Failed to add ${game.name}. It might already be in your backlog.`);
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
            onClick: () => navigate('/profile')
        },
        {
            type: 'divider' as const,
        },
        {
            key: 'logout',
            label: 'Logout',
            icon: <LogoutOutlined />,
            onClick: onLogout
        }
    ];

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
            <AutoComplete
              options={searchOptions}
              onSearch={handleSearch}
              onSelect={handleSelect}
              style={{ width: '100%', maxWidth: '600px' }}
              getInputElement={() => (
                <Input 
                  prefix={<SearchOutlined />} 
                  placeholder="Search games..."
                  size="middle"
                  allowClear
                />
              )}
            />
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
              <Button type="text" style={{ height: '40px', padding: '4px 8px' }}>
                <Space>
                  <Avatar src={user.avatar_url} size="small" />
                  <span style={{ color: '#000' }}>{user.display_name}</span>
                </Space>
              </Button>
            </Dropdown>
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
