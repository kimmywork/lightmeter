import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import {
  Select,
  MenuItem,
  Button as MuiButton,
  FormControl,
  InputLabel,
  Typography,
  Box, Tabs, Tab,
  IconButton  // 添加这行
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Logo from './components/Logo';  // 添加这行导入
// 添加导入
import HistoryIcon from '@mui/icons-material/History';
import HistoryDialog from './components/History';
import { formatShutterSpeed } from './utils/format';
import { useHistory } from './hooks/useHistory';
import { Snackbar, Alert } from '@mui/material';  // 添加这行
import ScreenRotationIcon from '@mui/icons-material/ScreenRotation';

const theme = createTheme({
  palette: {
    mode: 'dark',
  },
});

const Container = styled.div`
  max-width: 100vw;
  height: 100vh;
  padding: 10px;
  background: #1a1a1a;
  color: white;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const VideoContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: 500px;
  height: 35vh;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 10px;
  background: #000;
`;
const Video = styled.video`
  position: absolute;
  transform-origin: center center;
  border-radius: 10px;
  object-fit: cover;
`;

const StyledButton = styled(MuiButton)`
  padding: 15px;
  min-width: 50px;
`;

const Controls = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  background: #1a1a1a;
  overflow-y: auto;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  width: 100%;
`;

const AppTitle = styled.h1`
  margin: 0;
  font-size: 24px;
  font-weight: 500;
`;

// 在 App 组件中添加状态
const App = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [iso, setIso] = useState(100);
  const [aperture, setAperture] = useState(2.8);
  const [ev, setEv] = useState(0);
  const [shutterSpeed, setShutterSpeed] = useState(1 / 60);
  const [mode, setMode] = useState('shutter'); // 'shutter' 或 'aperture' 模式
  const [aspectRatio, setAspectRatio] = useState('3:2');
  const [isLandscape, setIsLandscape] = useState(false);

  const getVideoStyles = () => {
    const ratios = isLandscape ? {
      '1:1': { width: '35vh', height: '35vh', maxWidth: '35vh', maxHeight: '35vh' },
      '3:2': { width: '23vh', height: '35vh', maxWidth: '35vh', maxHeight: '35vh' },
      '4:3': { width: '26.25vh', height: '35vh', maxWidth: '35vh', maxHeight: '35vh' },
      '16:9': { width: '19.68vh', height: '35vh', maxWidth: '35vh', maxHeight: '35vh' }
    } : {
      '1:1': { width: '100vw', height: '100vw', maxWidth: '35vh', maxHeight: '35vh' },
      '3:2': { width: '100vw', height: '66.67vw', maxWidth: '52.5vh', maxHeight: '35vh' },
      '4:3': { width: '100vw', height: '75vw', maxWidth: '46.67vh', maxHeight: '35vh' },
      '16:9': { width: '100vw', height: '56.25vw', maxWidth: '62.22vh', maxHeight: '35vh' }
    };
  
    const style = ratios[aspectRatio] || ratios['3:2'];
    
    return {
      ...style,
      left: '50%',
      top: '50%',
      transform: `translate(-50%, -50%)`
    };
  };
  const getVideoActualSize = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return { width: 300, height: 300 };
    
    const videoRatio = video.videoWidth / video.videoHeight;
    const ratioValues = {
      '1:1': 1,
      '3:2': 1.5,
      '4:3': 1.33,
      '16:9': 1.77
    };
    
    const targetRatio = ratioValues[aspectRatio] || 1.5;
    
    // 计算实际需要截取的视频区域
    let sourceWidth, sourceHeight, sourceX, sourceY;
    
    if (videoRatio > targetRatio) {
      // 视频比例更宽，需要在两侧裁剪
      sourceHeight = video.videoHeight;
      sourceWidth = video.videoHeight * targetRatio;
      sourceX = (video.videoWidth - sourceWidth) / 2;
      sourceY = 0;
    } else {
      // 视频比例更窄，需要在上下裁剪
      sourceWidth = video.videoWidth;
      sourceHeight = video.videoWidth / targetRatio;
      sourceX = 0;
      sourceY = (video.videoHeight - sourceHeight) / 2;
    }
    
    return {
      width: Math.round(sourceWidth),
      height: Math.round(sourceHeight),
      x: Math.round(sourceX),
      y: Math.round(sourceY)
    };
  };
  const standardShutterSpeeds = [
    1 / 8000, 1 / 4000, 1 / 2000, 1 / 1000, 1 / 500, 1 / 250, 1 / 125, 1 / 60, 1 / 30, 1 / 15, 1 / 8, 1 / 4, 1 / 2,
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
          height: { ideal: 1080 },
          exposureMode: 'manual',
          whiteBalance: 'manual',
          exposureCompensation: 0,
          brightness: 0,
          contrast: 1,
          frameRate: { ideal: 30 }  // Stable frame rate for consistent readings
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
      1 / 8000, 1 / 4000, 1 / 2000, 1 / 1000, 1 / 500, 1 / 250, 1 / 125, 1 / 60, 1 / 30, 1 / 15, 1 / 8, 1 / 4, 1 / 2,
      1, 2, 4, 8, 15, 30
    ];

    // 找到最接近的标准快门速度
    let closestSpeed = standardSpeeds.reduce((prev, curr) => {
      return Math.abs(Math.log2(curr) - Math.log2(shutterValue)) <
        Math.abs(Math.log2(prev) - Math.log2(shutterValue)) ? curr : prev;
    });

    return closestSpeed;
  };

  // 添加新的状态
  const { history, addRecord, deleteRecord, clearHistory } = useHistory();
  const [historyOpen, setHistoryOpen] = useState(false);

  // 删除原来的 history 相关代码
  const calculateEV = () => {
    // Fix the readyState check logic (remove the extra negation)
    if (videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      return;
    }

    const samples = 10; // Increase samples for better accuracy
    let totalEV = 0;
    const canvas = canvasRef.current;

    const singleMeasurement = () => {
      const video = videoRef.current;
      const {width, height, x, y} = getVideoActualSize();
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d');
      context.drawImage(video, x, y, width, height, 0, 0, width, height);
      const imageData = context.getImageData(0, 0, width, height);
      const data = imageData.data;

      // Calculate center-weighted metering (giving more importance to the center)
      const centerWeight = 0.6; // 60% weight to center
      const centerArea = {
        x: Math.floor(width * 0.3),
        y: Math.floor(height * 0.3),
        width: Math.floor(width * 0.4),
        height: Math.floor(height * 0.4)
      };

      let totalLuminance = 0;
      let pixelCount = 0;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          
          // Check if pixel is in center area
          const isCenter = (
            x >= centerArea.x && 
            x <= centerArea.x + centerArea.width &&
            y >= centerArea.y && 
            y <= centerArea.y + centerArea.height
          );

          // Apply center-weighted metering
          const weight = isCenter ? centerWeight : (1 - centerWeight);

          const r = data[i] / 255;
          const g = data[i + 1] / 255;
          const b = data[i + 2] / 255;

          // Convert to linear RGB (gamma correction)
          const rLinear = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
          const gLinear = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
          const bLinear = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

          // Calculate luminance using Rec. 709 coefficients
          const luminance = (0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear) * weight;
          totalLuminance += luminance;
          pixelCount++;
        }
      }

      const averageLuminance = totalLuminance / pixelCount;
      
      // Adjust calibration factor based on device characteristics
      const baseCalibrationFactor = 12.5;
      const deviceBrightnessCompensation = 1.2; // Adjust based on device testing
      const calibrationFactor = baseCalibrationFactor * deviceBrightnessCompensation;

      // Add highlight and shadow protection
      const minLuminance = 0.001; // Prevent log2(0)
      const maxLuminance = 0.95;  // Prevent overexposure
      const clampedLuminance = Math.max(minLuminance, Math.min(maxLuminance, averageLuminance));

      return Math.log2(clampedLuminance * 100 * calibrationFactor);
    };
  
    // 进行多次采样
    for (let i = 0; i < samples; i++) {
      totalEV += singleMeasurement();
    }
  
    const calculatedEV = totalEV / samples;
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

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    // 检测是否是 iOS 设备
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    // 如果是 iOS 设备，检查是否已经安装
    if (isIOSDevice && !window.navigator.standalone) {
      // 使用 localStorage 来控制提示频率
      const lastPrompt = localStorage.getItem('lastIOSPrompt');
      const now = Date.now();
      if (!lastPrompt || (now - parseInt(lastPrompt)) > 1000 * 60 * 60 * 24) {
        setShowIOSPrompt(true);
        localStorage.setItem('lastIOSPrompt', now.toString());
      }
    }

    // Android/Desktop PWA 安装提示
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // 检查是否已经提示过
      const lastPrompt = localStorage.getItem('lastInstallPrompt');
      const now = Date.now();
      if (!lastPrompt || (now - parseInt(lastPrompt)) > 1000 * 60 * 60 * 24) {
        setShowInstallPrompt(true);
        localStorage.setItem('lastInstallPrompt', now.toString());
      }
    });
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
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
            style={getVideoStyles()}
          />
          <IconButton
          sx={{
            position: 'absolute',
            right: '10px',
            bottom: '10px',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
            }
          }}
          onClick={() => setIsLandscape(!isLandscape)}
        >
          <ScreenRotationIcon />
        </IconButton>
      </VideoContainer>
      <Tabs
        value={aspectRatio}
        onChange={(e, newValue) => setAspectRatio(newValue)}
        centered
        sx={{ mb: 1 }}
      >
        <Tab label="1:1" value="1:1" />
        <Tab label={isLandscape ? "2:3" : "3:2"} value="3:2" />
        <Tab label={isLandscape ? "3:4" : "4:3"} value="4:3" />
        <Tab label={isLandscape ? "9:16" : "16:9"} value="16:9" />
      </Tabs>
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
              <MenuItem value="shutter">光圈优先</MenuItem>
              <MenuItem value="aperture">快门优先</MenuItem>
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
         <Snackbar
          open={showInstallPrompt}
          autoHideDuration={15000}
          onClose={() => setShowInstallPrompt(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            severity="info"
            action={
              <>
                <MuiButton color="primary" size="small" onClick={handleInstallClick}>
                  安装
                </MuiButton>
                <MuiButton color="secondary" size="small" onClick={() => setShowInstallPrompt(false)}>
                  取消
                </MuiButton>
              </>
            }
          >
            安装应用到主屏幕以获得更好的体验
          </Alert>
        </Snackbar>

        {/* iOS 安装提示 */}
        <Snackbar
          open={showIOSPrompt}
          autoHideDuration={15000}
          onClose={() => setShowIOSPrompt(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            severity="info"
            onClose={() => setShowIOSPrompt(false)}
          >
            在 Safari 浏览器中，点击分享按钮，然后选择"添加到主屏幕"以安装应用
          </Alert>
        </Snackbar>
      </Container>
    </ThemeProvider>
  );
};

export default App;