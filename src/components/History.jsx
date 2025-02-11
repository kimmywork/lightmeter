import React from 'react';
import styled from 'styled-components';
import { 
  List, 
  ListItem, 
  Dialog, 
  DialogTitle, 
  DialogContent,
  Typography,
  IconButton,
  Button
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import { formatShutterSpeed } from '../utils/format';  // Add this import

const DialogHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 48px;
`;

const HistoryImage = styled.img`
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 8px;
`;

const HistoryItem = styled(ListItem)`
  display: flex;
  gap: 16px;
  padding: 16px;
`;

const HistoryContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const HistoryDialog = ({ open, onClose, history, onDelete, onClear }) => {
  const handleClear = () => {
    onClear();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        <DialogHeader>
          <Typography>测光历史</Typography>
          {history.length > 0 && (
            <Button 
              variant="outlined" 
              color="error" 
              size="small"
              onClick={handleClear}
              startIcon={<DeleteIcon />}
            >
              清空
            </Button>
          )}
        </DialogHeader>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {history.length === 0 ? (
          <Typography variant="body1" sx={{ textAlign: 'center', py: 4 }}>
            暂无测光记录
          </Typography>
        ) : (
          <List>
            {history.map((record) => (
              <HistoryItem key={record.timestamp} divider>
                <HistoryImage src={record.image} alt="测光场景" />
                <HistoryContent>
                  <Typography variant="subtitle1">
                    {new Date(record.timestamp).toLocaleString()}
                  </Typography>
                  <Typography variant="body2">EV: {record.ev}</Typography>
                  <Typography variant="body2">ISO: {record.iso}</Typography>
                  <Typography variant="body2">
                    {record.mode === 'shutter' 
                      ? `光圈: f/${record.aperture.toFixed(1)}` 
                      : `快门: ${formatShutterSpeed(record.shutterSpeed)}`
                    }
                  </Typography>
                  <Typography variant="body2">
                    {record.mode === 'shutter' 
                      ? `快门: ${formatShutterSpeed(record.shutterSpeed)}` 
                      : `光圈: f/${record.aperture.toFixed(1)}`
                    }
                  </Typography>
                </HistoryContent>
                <IconButton 
                  color="error"
                  onClick={() => onDelete(record.timestamp)}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  <DeleteIcon />
                </IconButton>
              </HistoryItem>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default HistoryDialog;