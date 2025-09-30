import { ConfigProvider, Tabs } from 'antd';
import 'antd/dist/reset.css';
import IntervieweePage from './pages/Interviewee';
import InterviewerPage from './pages/Interviewer';
import { ThemeProvider } from './contexts/ThemeContext';
import ThemeToggle from './components/ThemeToggle';

function App() {
  return (
    <ThemeProvider>
      <ConfigProvider>
        <div className="min-h-screen w-full theme-bg-primary">
          <ThemeToggle />
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-3xl font-bold text-center theme-text-primary mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              🚀 AI Interview Assistant
            </h1>
            <div className="theme-bg-glass backdrop-blur-lg rounded-2xl theme-shadow-lg theme-border-glass overflow-hidden">
              <Tabs
                items={[
                  { 
                    key: 'interviewee', 
                    label: (
                      <span className="flex items-center gap-2 theme-text-primary font-medium">
                        👤 Interviewee
                      </span>
                    ), 
                    children: <IntervieweePage /> 
                  },
                  { 
                    key: 'interviewer', 
                    label: (
                      <span className="flex items-center gap-2 theme-text-primary font-medium">
                        🎯 Interviewer
                      </span>
                    ), 
                    children: <InterviewerPage /> 
                  },
                ]}
                className="w-full"
                tabBarStyle={{
                  background: 'var(--bg-glass)',
                  margin: 0,
                  padding: '0 20px'
                }}
              />
            </div>
          </div>
        </div>
      </ConfigProvider>
    </ThemeProvider>
  )
}

export default App
