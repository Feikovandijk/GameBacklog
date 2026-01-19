import React from 'react';

interface LoginPageProps {
    onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    return (
        <div className='min-h-screen flex items-center justify-center bg-background-main relative overflow-hidden'>
            {/* Background gradients */}
            <div className='absolute inset-0 bg-background-main z-0'>
                <div className='absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-accent-purple/20 via-transparent to-transparent opacity-50' />
                <div className='absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-accent-blue/20 via-transparent to-transparent opacity-50' />
            </div>

            <div className='relative z-10 w-full max-w-md p-8'>
                <div className='bg-surface-dark/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl text-center'>
                    <div className='mb-8'>
                        <div className='w-16 h-16 mx-auto bg-gradient-to-br from-accent-purple to-accent-blue rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-accent-purple/30 group'>
                            <span className='material-symbols-outlined text-white text-4xl group-hover:scale-110 transition-transform'>
                                sports_esports
                            </span>
                        </div>
                        <h1 className='text-3xl font-bold text-white mb-2 tracking-tight'>
                            Welcome Back
                        </h1>
                        <p className='text-text-secondary text-lg'>
                            Sign in to manage your game backlog
                        </p>
                    </div>

                    <button
                        onClick={onLogin}
                        className='w-full group relative flex items-center justify-center gap-3 px-8 py-4 bg-[#171a21] hover:bg-[#1b1f28] text-white rounded-xl font-bold text-lg transition-all duration-300 border border-white/10 hover:border-white/20 hover:shadow-lg hover:shadow-accent-purple/10'
                    >
                        <img
                            src='https://store.cloudflare.steamstatic.com/public/shared/images/header/logo_steam.svg?t=962016'
                            alt='Steam Logo'
                            className='w-6 h-6 opacity-90 group-hover:opacity-100 transition-opacity'
                        />
                        Login with Steam
                        <span className='absolute inset-0 rounded-xl bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity' />
                    </button>

                    <p className='mt-8 text-sm text-text-muted'>
                        By logging in, you agree to our privacy policy and terms of service.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
