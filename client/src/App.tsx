import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAuthStatus, getImages, uploadImage } from './api';

function App() {
  const [user, setUser] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [uploadQueue, setUploadQueue] = useState<File[]>([]);
  const [uploadSectionVisible, setUploadSectionVisible] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  // Get auth status
  useEffect(() => {
    getAuthStatus()
      .then(data => {
        if (data.user) setUser(data.user);
      })
      .catch(console.error);
  }, []);

  // Load images once user is authenticated
  useEffect(() => {
    if (!user) return;

    getImages()
      .then(data => {
        if (data.images) setImages(data.images);
      })
      .catch(err => console.error('Failed to fetch images:', err));
  }, [user]);

  // Setup WebSocket connection
  useEffect(() => {
    if (user) {
      socketRef.current = io('http://localhost:3002', { withCredentials: true });

      socketRef.current.on('uploadComplete', (data: { url: string }) => {
        setImages(prev => [...prev, data.url]);
      });

      socketRef.current.on('connect_error', (err) => {
        console.error('Socket connect error:', err);
      });
    } else {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setImages([]);
    }

    return () => {
      socketRef.current?.off('uploadComplete');
      socketRef.current?.off('connect_error');
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  // Drag and drop
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    setUploadQueue(prev => [...prev, ...files]);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  // File input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setUploadQueue(prev => [...prev, ...files]);
  };

  // Upload logic
  useEffect(() => {
    if (uploadQueue.length === 0 || uploading) return;

    const uploadNext = async () => {
    setUploading(true);
    const currentFile = uploadQueue[0];
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];

    if (!allowedTypes.includes(currentFile.type)) {
      console.warn("Invalid file type:", currentFile.type);
      setUploadSectionVisible(false);
      setUploadQueue(prev => prev.slice(1));
      setUploading(false);
      return;
    }

    // Simulated progress
    let simulatedProgress = 0;
    const progressInterval = setInterval(() => {
      simulatedProgress += Math.random() * 10 + 5; // increment randomly between 5 and 15
      if (simulatedProgress >= 90) {
        simulatedProgress = 90;
        clearInterval(progressInterval);
      }
      setProgress(Math.round(simulatedProgress));
    }, 100); // every 100ms

    try {
      await uploadImage(currentFile); // real upload

      clearInterval(progressInterval);
      setProgress(100); // jump to 100% on completion

      setTimeout(() => {
        setProgress(0); // reset after short delay
      }, 300);
    } catch (err) {
      console.error(`Upload failed for ${currentFile.name}:`, err);
      alert(`Failed to upload ${currentFile.name}`);
      clearInterval(progressInterval);
      setProgress(0);
    } finally {
      setUploadQueue(prev => prev.slice(1));
      setUploading(false);
    }
  };


    uploadNext();
  }, [uploadQueue, uploading, images.length]);

  // Delete handler
  const handleDelete = async (url: string) => {
    try {
      const res = await fetch('http://localhost:3001/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(`Failed to delete image: ${data.error || res.statusText}`);
        return;
      }

      setImages(prev => prev.filter(img => img !== url));
    } catch (err) {
      alert('Failed to delete image (network error)');
      console.error(err);
    }
  };

  // Logout
  const handleLogout = async () => {
    await fetch('http://localhost:3001/logout', {
      method: 'POST',
      credentials: 'include',
    });

    setUser(null);
    setImages([]);
    setProgress(0);
    socketRef.current?.disconnect();
    socketRef.current = null;
  };

  // UI
  return user ? (
    <div className="h-screen flex flex-col items-center text-center px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Welcome, {user.name} 👋</h1>

      {/* Upload Section or Reload Button */}
      {uploadSectionVisible ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className={`border-2 border-dashed p-6 rounded-lg mb-6 w-full max-w-md ${
            uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            disabled={uploading}
            className="w-full mb-2"
          />
          <p className="text-gray-600">Drag & drop images here or click to select</p>
        </div>
      ) : (
        <div className="mb-6 text-center">
          <p className="text-red-600 mb-4">❌ Invalid file uploaded. Upload section is disabled.</p>
          <button
            onClick={() => {
              setUploadSectionVisible(true);
              setUploadQueue([]);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            Reload Upload Section
          </button>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div style={{ marginTop: 8, width: '100%', maxWidth: 400 }}>
          <div style={{ height: 10, backgroundColor: '#eee', borderRadius: 5 }}>
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                backgroundColor: '#3b82f6',
                borderRadius: 5,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <p className="text-sm mt-2">{progress}% uploaded</p>
        </div>
      )}

      {/* Queue Status */}
      {uploadQueue.length > 0 && (
        <p className="text-sm mt-2 text-gray-700">
          Uploading: {uploadQueue[0].name} ({uploadQueue.length} file(s) in queue)
        </p>
      )}

      {/* Image Grid */}
      <div className="grid grid-cols-3 gap-4 mt-8 max-w-xl w-full">
        {images.map((url, i) => (
          <div key={i} className="relative group rounded shadow-md w-full overflow-hidden aspect-square">
            <img
              src={url}
              alt={`Uploaded #${i + 1}`}
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => handleDelete(url)}
              className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
              aria-label="Delete image"
              title="Delete image"
            >
              &#x2716;
            </button>
          </div>
        ))}
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition mt-6"
      >
        Logout
      </button>
    </div>
  ) : (
    <div className="h-screen flex flex-col justify-center items-center text-center px-4">
      <h1 className="text-3xl font-bold mb-6">Welcome 👋</h1>
      <button
        onClick={() => (window.location.href = 'http://localhost:3001/login/google')}
        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
      >
        Sign in with Google
      </button>
    </div>
  );
}

export default App;
