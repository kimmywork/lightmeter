import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { 
  Select, 
  MenuItem, 
  Button as MuiButton,
  FormControl, 
  InputLabel,
  Typography,
  Box,
  IconButton  // 添加这行
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Logo from './components/Logo';  // 添加这行导入
// 添加导入
import HistoryIcon from '@mui/icons-material/History';
import HistoryDialog from './components/History';
import { formatShutterSpeed } from './utils/format';
import { useHistory } from './hooks/useHistory';

const theme = createTheme({
  palette: {
    mode: 'dark',
  },
});

const Container = styled.div`
  max-width: 100vw;
  min-height: 100vh;
  padding: 20px;
  background: #1a1a1a;
  color: white;
`;

const Video = styled.video`
  width: 100%;
  max-width: 500px;
  border-radius: 10px;
  transform-origin: center center;
  object-fit: cover; // 确保视频填充整个容器
`;

const VideoContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: 500px;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const Controls = styled.div`
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const ZoomControls = styled.div`
  position: absolute;
  bottom: 20px; // 增加底部间距，避免被 iOS Safari 工具栏遮挡
  right: 10px;
  display: flex;
  gap: 10px;
  z-index: 1000; // 确保按钮可点击
`;

const StyledButton = styled(MuiButton)`
  padding: 15px;
  min-width: 50px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  width: 100%;
`;

const AppTitle = styled.h1`
  margin: 0;
  font-size: 24px;
  font-weight: 500;
`;

const App = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [iso, setIso] = useState(100);
  const [aperture, setAperture] = useState(2.8);
  const [ev, setEv] = useState(0);
  const [shutterSpeed, setShutterSpeed] = useState(1/60);
  const [mode, setMode] = useState('shutter'); // 'shutter' 或 'aperture' 模式

  const standardShutterSpeeds = [
    1/8000, 1/4000, 1/2000, 1/1000, 1/500, 1/250, 1/125, 1/60, 1/30, 1/15, 1/8, 1/4, 1/2,
    1, 2, 4, 8, 15, 30
  ];

  useEffect(() => {
    // 锁定屏幕方向
    if (window.screen.orientation && window.screen.orientation.lock) {
      window.screen.orientation.lock('portrait').catch(() => {
        // 某些浏览器可能不支持方向锁定
        console.log('Orientation lock not supported');
      });
    }
    
    startCamera();
  }, []);

  const startCamera = async () => {
    try {
      const constraints = { 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const video = videoRef.current;
      video.srcObject = stream;
      video.setAttribute('playsinline', 'true'); // iOS Safari 需要
      video.setAttribute('webkit-playsinline', 'true'); // 旧版 iOS Safari 需要
    } catch (err) {
      console.error('Error accessing camera:', err);
    }
  };

  const getStandardShutterSpeed = (shutterValue) => {
    // 标准快门速度档位（秒）
    const standardSpeeds = [
      1/8000, 1/4000, 1/2000, 1/1000, 1/500, 1/250, 1/125, 1/60, 1/30, 1/15, 1/8, 1/4, 1/2,
      1, 2, 4, 8, 15, 30
    ];
    
    // 找到最接近的标准快门速度
    let closestSpeed = standardSpeeds.reduce((prev, curr) => {
      return Math.abs(Math.log2(curr) - Math.log2(shutterValue)) < 
             Math.abs(Math.log2(prev) - Math.log2(shutterValue)) ? curr : prev;
    });
    
    return closestSpeed;
  };

  const [zoom, setZoom] = useState(1);
  
  // 添加新的状态
  const { history, addRecord, deleteRecord, clearHistory } = useHistory();
  const [historyOpen, setHistoryOpen] = useState(false);

  // 删除原来的 history 相关代码
  const calculateEV = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');
    
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    let totalLuminance = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      
      const rLinear = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
      const gLinear = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
      const bLinear = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
      
      const luminance = 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
      totalLuminance += luminance;
    }
    
    const averageLuminance = totalLuminance / (data.length / 4);
    
    const calibrationFactor = 12.5;
    const calculatedEV = Math.log2(averageLuminance * 100 * calibrationFactor);
    setEv(calculatedEV.toFixed(1));
    
    let standardShutter, newAperture;
    
    if (mode === 'shutter') {
      const shutterValue = Math.pow(2, -calculatedEV) * (100 / iso) * Math.pow(aperture, 2);
      if (shutterValue <= 0) {
        setShutterSpeed(null);
        return;
      }
      standardShutter = getStandardShutterSpeed(shutterValue);
      setShutterSpeed(standardShutter);
    } else {
      const calculatedAperture = Math.sqrt(shutterSpeed * (100 / iso) * Math.pow(2, calculatedEV));
      const standardApertures = [1.0, 1.2, 1.4, 1.8, 2, 2.8, 4, 5.6, 8, 11, 16, 22];
      newAperture = standardApertures.reduce((prev, curr) => {
        return Math.abs(Math.log2(curr) - Math.log2(calculatedAperture)) < 
               Math.abs(Math.log2(prev) - Math.log2(calculatedAperture)) ? curr : prev;
      });
      setAperture(newAperture);
    }
  
    // 保存历史记录
    const newRecord = {
      timestamp: Date.now(),
      image: canvas.toDataURL('image/jpeg'),
      ev: calculatedEV.toFixed(1),
      mode,
      iso,
      aperture: mode === 'shutter' ? aperture : newAperture,
      shutterSpeed: mode === 'shutter' ? standardShutter : shutterSpeed
    };

    addRecord(newRecord);
  };
  
return (
  <ThemeProvider theme={theme}>
    <Container>
      <Header>
        <Logo />
        <AppTitle>测光表</AppTitle>
        <div style={{ flexGrow: 1 }} />
        <IconButton color="inherit" onClick={() => setHistoryOpen(true)}>
          <HistoryIcon />
        </IconButton>
      </Header>
        <VideoContainer>
          <Video 
            ref={videoRef} 
            autoPlay 
            playsInline
            style={{ 
              transform: `scale(${zoom})`,
              transformOrigin: 'center center'
            }}
          />
          <ZoomControls>
            <StyledButton 
              variant="contained" 
              onClick={() => setZoom(prev => Math.max(1, prev - 0.2))}
            >
              -
            </StyledButton>
            <StyledButton 
              variant="contained" 
              onClick={() => setZoom(prev => Math.min(3, prev + 0.2))}
            >
              +
            </StyledButton>
          </ZoomControls>
        </VideoContainer>

        <canvas 
          ref={canvasRef} 
          style={{ display: 'none' }} 
          width="300" 
          height="300"
        />
        <Controls>
          <FormControl fullWidth>
            <InputLabel>测光模式</InputLabel>
            <Select
              value={mode}
              label="测光模式"
              onChange={(e) => setMode(e.target.value)}
            >
              <MenuItem value="shutter">计算快门速度</MenuItem>
              <MenuItem value="aperture">计算光圈值</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>ISO</InputLabel>
            <Select
              value={iso}
              label="ISO"
              onChange={(e) => setIso(Number(e.target.value))}
            >
              <MenuItem value={50}>50</MenuItem>
              <MenuItem value={100}>100</MenuItem>
              <MenuItem value={200}>200</MenuItem>
              <MenuItem value={400}>400</MenuItem>
              <MenuItem value={800}>800</MenuItem>
              <MenuItem value={1600}>1600</MenuItem>
              <MenuItem value={3200}>3200</MenuItem>
              <MenuItem value={6400}>6400</MenuItem>
              <MenuItem value={12800}>12800</MenuItem>
            </Select>
          </FormControl>

          {mode === 'shutter' ? (
            <FormControl fullWidth>
              <InputLabel>光圈 f/</InputLabel>
              <Select
                value={aperture}
                label="光圈 f/"
                onChange={(e) => setAperture(Number(e.target.value))}
              >
                <MenuItem value={1.0}>1.0</MenuItem>
                <MenuItem value={1.2}>1.2</MenuItem>
                <MenuItem value={1.4}>1.4</MenuItem>
                <MenuItem value={1.8}>1.8</MenuItem>
                <MenuItem value={2}>2.0</MenuItem>
                <MenuItem value={2.8}>2.8</MenuItem>
                <MenuItem value={4}>4.0</MenuItem>
                <MenuItem value={5.6}>5.6</MenuItem>
                <MenuItem value={8}>8.0</MenuItem>
                <MenuItem value={11}>11.0</MenuItem>
                <MenuItem value={16}>16.0</MenuItem>
                <MenuItem value={22}>22.0</MenuItem>
              </Select>
            </FormControl>
          ) : (
            <FormControl fullWidth>
              <InputLabel>快门速度</InputLabel>
              <Select
                value={shutterSpeed}
                label="快门速度"
                onChange={(e) => setShutterSpeed(Number(e.target.value))}
              >
                {standardShutterSpeeds.map(speed => (
                  <MenuItem key={speed} value={speed}>
                    {formatShutterSpeed(speed)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <StyledButton 
            variant="contained" 
            color="primary" 
            onClick={calculateEV}
            fullWidth
          >
            测光
          </StyledButton>

          <Box sx={{ mt: 2 }}>
            <Typography variant="h6">EV: {ev}</Typography>
            <Typography variant="h6">
              {mode === 'shutter' ? 
                `快门速度: ${shutterSpeed ? formatShutterSpeed(shutterSpeed) : '无效值'}` :
                `光圈: f/${aperture.toFixed(1)}`
              }
            </Typography>
          </Box>
        </Controls>
        <HistoryDialog 
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          history={history}
          onDelete={deleteRecord}
          onClear={clearHistory}
        />
      </Container>
    </ThemeProvider>
  );
};

export default App;