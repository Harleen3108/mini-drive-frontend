"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface File {
  id: string;
  name: string;
  url: string;
  size: number;
  user_id: string;
  created_at: string;
  file_type?: string;
  profiles?: {
    email: string;
  };
}

interface User {
  created_at: string | number | Date;
  id: string;
  email: string;
  role: string;
}

interface FileShare {
  id: string;
  file_id: string;
  shared_by: string;
  shared_with: string;
  permission: string;
  created_at: string;
  files?: File;
  shared_by_profile?: User;
}

export default function DashboardContent() {
  const [user, setUser] = useState<User | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [sharedFiles, setSharedFiles] = useState<FileShare[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"files" | "shared" | "admin">(
    "files"
  );
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [sharePermission, setSharePermission] = useState<"view" | "edit">(
    "view"
  );
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  // Load theme preference on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme) {
        setIsDarkMode(savedTheme === "dark");
      } else {
        // Default to system preference if no saved theme
        setIsDarkMode(
          window.matchMedia("(prefers-color-scheme: dark)").matches
        );
      }
    }
  }, []);

  // Save theme to localStorage when it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", isDarkMode ? "dark" : "light");
    }
  }, [isDarkMode]);

  const loadUserFiles = async (userId: string) => {
    const { data: filesData } = await supabase
      .from("files")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    setFiles(filesData || []);
  };

  const loadSharedFiles = async (userId: string) => {
    const { data: sharedData } = await supabase
      .from("file_shares")
      .select(
        `
        *,
        files (*),
        shared_by_profile:profiles!file_shares_shared_by_fkey(*)
      `
      )
      .eq("shared_with", userId);

    setSharedFiles(sharedData || []);
  };

  const loadAdminData = async () => {
    const { data: filesData } = await supabase
      .from("files")
      .select(
        `
        *,
        profiles (
          email
        )
      `
      )
      .order("created_at", { ascending: false });

    setFiles(filesData || []);

    const { data: usersData } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    setAllUsers(usersData || []);
  };

  // Define loadData with useCallback to fix the useEffect dependency warning
  const loadData = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/");
        return;
      }

      const { data: userData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      setUser(userData);

      if (userData?.role === "admin") {
        await loadAdminData();
      } else {
        await loadUserFiles(session.user.id);
      }

      await loadSharedFiles(session.user.id);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [router]); // Add router as dependency since it's used inside

  useEffect(() => {
    loadData();
  }, [loadData]); // Now loadData is properly included as a dependency

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File too large! Maximum size is 5MB.");
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64Data = e.target?.result as string;

          // Remove unused 'data' variable to fix ESLint warning
          const { error } = await supabase
            .from("files")
            .insert([
              {
                name: file.name,
                url: base64Data,
                size: file.size,
                user_id: session.user.id,
                file_type: file.type,
              },
            ])
            .select();

          if (error) throw error;

          alert("File uploaded successfully!");
          loadData();
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Upload failed';
          alert("Upload failed: " + errorMessage);
        }
      };
      reader.readAsDataURL(file);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      alert("Upload failed: " + errorMessage);
    }
  };

  const handleViewFile = (file: File) => {
    if (file.url.startsWith("data:")) {
      const newWindow = window.open();
      if (newWindow) {
        if (file.file_type?.startsWith("image/")) {
          newWindow.document.write(`
            <html>
              <head><title>${file.name}</title></head>
              <body style="margin:0; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#f8f9fa;">
                <img src="${file.url}" style="max-width:90%; max-height:90%; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.15);" alt="${file.name}" />
              </body>
            </html>
          `);
        } else if (file.file_type === "application/pdf") {
          newWindow.document.write(`
            <html>
              <head><title>${file.name}</title></head>
              <body style="margin:0;">
                <embed src="${file.url}" type="application/pdf" width="100%" height="100%" style="min-height:100vh;" />
              </body>
            </html>
          `);
        } else {
          newWindow.document.write(`
            <html>
              <head><title>${file.name}</title></head>
              <body style="margin:0; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#f8f9fa; flex-direction:column; gap:20px;">
                <h2 style="color:#1f2937;">${file.name}</h2>
                <p style="color:#6b7280;">This file type cannot be previewed directly.</p>
                <a href="${file.url}" download="${file.name}" style="padding:12px 24px; background:#3b82f6; color:white; text-decoration:none; border-radius:8px; font-weight:600;">
                  Download File
                </a>
              </body>
            </html>
          `);
        }
      }
    } else {
      window.open(file.url, "_blank");
    }
  };

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (!confirm(`Delete "${fileName}"?`)) return;

    try {
      const { error } = await supabase.from("files").delete().eq("id", fileId);

      if (error) throw error;

      alert("File deleted!");
      loadData();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Delete failed';
      alert("Delete failed: " + errorMessage);
    }
  };

  const handleShareFile = (file: File) => {
    setSelectedFile(file);
    setShowShareModal(true);
  };

const executeShare = async () => {
  if (!selectedFile || !shareEmail) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    console.log("🔍 DEBUG: Looking for user:", shareEmail);

    // Check ALL users in the profiles table
    const { data: allUsers } = await supabase
      .from('profiles')
      .select('email, id, created_at')
      .order('email');
    
    console.log("📋 ALL REGISTERED USERS:", allUsers);

    // Try to find the specific user
    const { data: targetUser, error: userError } = await supabase
      .from("profiles")
      .select("id, email")
      .ilike("email", shareEmail)  // Case-insensitive search
      .single();

    console.log("🎯 TARGET USER RESULT:", targetUser);
    console.log("❌ USER ERROR:", userError);

    if (userError || !targetUser) {
      console.log("🚫 USER NOT FOUND - Available users:", allUsers?.map(u => u.email));
      alert(
        `User "${shareEmail}" is not registered yet! 🚫\n\nAvailable users: ${allUsers?.map(u => u.email).join(', ')}`
      );
      return;
    }

    // Rest of your sharing code...

    console.log("Found user:", targetUser);
    console.log("Creating share...");

    const { error: shareError } = await supabase.from("file_shares").insert([
      {
        file_id: selectedFile.id,
        shared_by: session.user.id,
        shared_with: targetUser.id,
        permission: sharePermission,
      },
    ]);

    console.log("Share creation error:", shareError);

    if (shareError) throw shareError;

    alert(
      `✅ File shared successfully with ${shareEmail}!\n\nPermission: ${sharePermission === "view" ? "View Only" : "Can Edit"}\n\nThey can find it in their "Shared Files" tab.`
    );
    setShowShareModal(false);
    setShareEmail("");
    setSelectedFile(null);
  } catch (error: unknown) {
    console.error("Share failed:", error);
    const errorMessage = error instanceof Error ? error.message : 'Share failed';
    alert("Share failed: " + errorMessage);
  }
};

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <div className={`w-16 h-16 border-4 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} border-t-blue-600 rounded-full animate-spin mx-auto mb-4`}></div>
          <div className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Loading your drive
          </div>
          <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-2`}>
            Just a moment...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`sticky top-0 z-40 backdrop-blur-xl border-b ${isDarkMode ? 'bg-gray-800/95 border-gray-700' : 'bg-white/95 border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg sm:p-2.5">
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                </svg>
              </div>
              <div>
                <h1 className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Mini Drive
                </h1>
                <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} hidden sm:block`}>
                  Secure File Management
                </p>
              </div>
            </div>

            {/* Desktop Right Section */}
            <div className="hidden sm:flex items-center gap-4">
              <div className="hidden md:flex flex-col items-end">
                <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {user?.email}
                </p>
                {user?.role === "admin" && (
                  <span className="text-xs font-bold text-blue-600">
                    ADMINISTRATOR
                  </span>
                )}
              </div>
              
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDarkMode ? '☀️' : '🌙'}
              </button>

              <label className={`px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer font-semibold text-sm shadow-sm hover:shadow-md ${isDarkMode ? 'shadow-blue-500/10' : ''}`}>
                Upload
                <input
                  type="file"
                  className="hidden"
                  onChange={handleUpload}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt"
                />
              </label>
              <button
                onClick={handleSignOut}
                className={`px-4 py-2.5 rounded-lg transition-colors font-semibold text-sm border ${
                  isDarkMode 
                    ? 'text-gray-300 hover:bg-gray-700 border-gray-600' 
                    : 'text-gray-700 hover:bg-gray-50 border-gray-300'
                }`}
              >
                Sign Out
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center gap-2 sm:hidden">
              {/* Theme Toggle - Mobile */}
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDarkMode ? '☀️' : '🌙'}
              </button>

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                {isMobileMenuOpen ? '✕' : '☰'}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className={`sm:hidden border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} py-4`}>
              <div className="flex flex-col space-y-3">
                <div className="text-center">
                  <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {user?.email}
                  </p>
                  {user?.role === "admin" && (
                    <span className="text-xs font-bold text-blue-600">
                      ADMINISTRATOR
                    </span>
                  )}
                </div>
                
                <label className={`w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer font-semibold text-sm text-center shadow-sm ${isDarkMode ? 'shadow-blue-500/10' : ''}`}>
                  Upload File
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleUpload}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt"
                  />
                </label>
                
                <button
                  onClick={handleSignOut}
                  className={`w-full px-4 py-3 rounded-lg transition-colors font-semibold text-sm border ${
                    isDarkMode 
                      ? 'text-gray-300 hover:bg-gray-700 border-gray-600' 
                      : 'text-gray-700 hover:bg-gray-50 border-gray-300'
                  }`}
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className={`flex gap-4 sm:gap-8 border-t px-0 overflow-x-auto ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <button
              onClick={() => setActiveTab("files")}
              className={`py-3 sm:py-4 px-2 sm:px-0 border-b-2 font-semibold text-sm transition-all whitespace-nowrap ${
                activeTab === "files"
                  ? "border-blue-600 text-blue-600"
                  : `border-transparent ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`
              }`}
            >
              My Files{" "}
              <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>
                ({files.length})
              </span>
            </button>
            <button
              onClick={() => setActiveTab("shared")}
              className={`py-3 sm:py-4 px-2 sm:px-0 border-b-2 font-semibold text-sm transition-all whitespace-nowrap ${
                activeTab === "shared"
                  ? "border-blue-600 text-blue-600"
                  : `border-transparent ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`
              }`}
            >
              Shared{" "}
              <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>
                ({sharedFiles.length})
              </span>
            </button>
            {user?.role === "admin" && (
              <button
                onClick={() => setActiveTab("admin")}
                className={`py-3 sm:py-4 px-2 sm:px-0 border-b-2 font-semibold text-sm transition-all whitespace-nowrap ${
                  activeTab === "admin"
                    ? "border-blue-600 text-blue-600"
                    : `border-transparent ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`
                }`}
              >
                Users{" "}
                <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>
                  ({allUsers.length})
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Shared Files Tab */}
        {activeTab === "shared" && (
          <div>
            <div className="mb-6 sm:mb-8">
              <h2 className={`text-2xl sm:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Shared Files
              </h2>
              <p className={`mt-1 sm:mt-2 text-sm sm:text-base ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Files shared with you by other users
              </p>
            </div>

            {sharedFiles.length === 0 ? (
              <div className={`rounded-xl sm:rounded-2xl border-2 border-dashed p-8 sm:p-16 text-center ${
                isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
              }`}>
                <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">📭</div>
                <h3 className={`text-lg sm:text-xl font-semibold mb-1 sm:mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  No shared files yet
                </h3>
                <p className={`text-sm sm:text-base ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  When others share files with you, they&apos;ll appear here
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {sharedFiles.map((share) => (
                  <div
                    key={share.id}
                    className={`rounded-lg sm:rounded-xl border shadow-sm hover:shadow-lg transition-all duration-200 p-4 sm:p-6 ${
                      isDarkMode 
                        ? 'bg-gray-800 border-gray-700 hover:border-gray-600' 
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="mb-3 sm:mb-4">
                      <h3
                        className={`font-semibold truncate text-sm sm:text-base mb-1 sm:mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                        title={share.files?.name}
                      >
                        {share.files?.name}
                      </h3>
                      <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {formatFileSize(share.files?.size || 0)}
                      </p>
                      <div className={`mt-3 sm:mt-4 pt-3 sm:pt-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                        <p className={`text-xs mb-1 sm:mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          From
                        </p>
                        <p className="text-xs sm:text-sm font-medium text-blue-600 truncate">
                          {share.shared_by_profile?.email}
                        </p>
                        <div className="mt-2 sm:mt-3 inline-block">
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded-full border ${
                              share.permission === "view"
                                ? isDarkMode
                                  ? "bg-gray-700 text-gray-300 border-gray-600"
                                  : "bg-gray-50 text-gray-700 border-gray-200"
                                : isDarkMode
                                ? "bg-blue-900/30 text-blue-300 border-blue-800"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}
                          >
                            {share.permission === "view"
                              ? "View Only"
                              : "Can Edit"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleViewFile(share.files!)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 sm:py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-colors mt-3 sm:mt-4"
                    >
                      Open File
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Admin Panel */}
        {activeTab === "admin" && (
          <div>
            <div className="mb-6 sm:mb-8">
              <h2 className={`text-2xl sm:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                User Management
              </h2>
              <p className={`mt-1 sm:mt-2 text-sm sm:text-base ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Manage system users and permissions
              </p>
            </div>
            <div className={`rounded-xl sm:rounded-2xl border shadow-sm overflow-hidden ${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className={`border-b ${
                      isDarkMode ? 'border-gray-700 bg-gray-700/50' : 'border-gray-200 bg-gray-50'
                    }`}>
                      <th className={`px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Email
                      </th>
                      <th className={`px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Role
                      </th>
                      <th className={`px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Joined
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${
                    isDarkMode ? 'divide-gray-700' : 'divide-gray-200'
                  }`}>
                    {allUsers.map((u) => (
                      <tr
                        key={u.id}
                        className={`transition-colors ${
                          isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {u.email}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs font-semibold border ${
                              u.role === "admin"
                                ? isDarkMode
                                  ? "bg-purple-900/30 text-purple-300 border-purple-800"
                                  : "bg-purple-50 text-purple-700 border-purple-200"
                                : isDarkMode
                                ? "bg-gray-700 text-gray-300 border-gray-600"
                                : "bg-gray-100 text-gray-700 border-gray-200"
                            }`}
                          >
                            {u.role === "admin" ? "Admin" : "User"}
                          </span>
                        </td>
                        <td className={`px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm font-medium ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* My Files Panel */}
        {activeTab === "files" && (
          <div>
            <div className="mb-6 sm:mb-8">
              <h2 className={`text-2xl sm:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {user?.role === "admin" ? "All Files" : "Your Files"}
              </h2>
              <p className={`mt-1 sm:mt-2 text-sm sm:text-base ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Manage and organize your documents
              </p>
            </div>

            {files.length === 0 ? (
              <div className={`rounded-xl sm:rounded-2xl border-2 border-dashed p-8 sm:p-16 text-center ${
                isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
              }`}>
                <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">📁</div>
                <h3 className={`text-lg sm:text-xl font-semibold mb-1 sm:mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  No files yet
                </h3>
                <p className={`text-sm sm:text-base mb-4 sm:mb-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {user?.role === "admin"
                    ? "No files have been uploaded by any users yet."
                    : "Upload your first file to get started"}
                </p>
                <label className={`inline-block px-4 py-2.5 sm:px-6 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer font-semibold text-sm shadow-md hover:shadow-lg ${
                  isDarkMode ? 'shadow-blue-500/10' : ''
                }`}>
                  Upload File
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleUpload}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt"
                  />
                </label>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className={`rounded-lg sm:rounded-xl border shadow-sm hover:shadow-lg transition-all duration-200 p-4 sm:p-6 group ${
                      isDarkMode 
                        ? 'bg-gray-800 border-gray-700 hover:border-gray-600' 
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="mb-3 sm:mb-4">
                      <h3
                        className={`font-semibold truncate text-sm sm:text-base group-hover:text-blue-600 transition-colors ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}
                        title={file.name}
                      >
                        {file.name}
                      </h3>
                      <p className={`text-xs sm:text-sm mt-1 sm:mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {formatFileSize(file.size)}
                      </p>
                      <p className={`text-xs mt-2 sm:mt-3 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        {new Date(file.created_at).toLocaleDateString()}
                      </p>
                      {user?.role === "admin" && file.profiles && (
                        <p className={`text-xs font-medium mt-1 sm:mt-2 ${
                          isDarkMode ? 'text-purple-400' : 'text-purple-600'
                        }`}>
                          Owner: {file.profiles.email}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-1 sm:gap-2">
                      <button
                        onClick={() => handleViewFile(file)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 sm:py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-colors"
                      >
                        Open
                      </button>
                      <button
                        onClick={() => handleShareFile(file)}
                        className={`flex-1 py-2 sm:py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-colors border ${
                          isDarkMode
                            ? 'bg-gray-700 hover:bg-blue-900/30 text-gray-300 hover:text-blue-400 border-gray-600 hover:border-blue-800'
                            : 'bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-600 border-gray-200 hover:border-blue-200'
                        }`}
                      >
                        Share
                      </button>
                      <button
                        onClick={() => handleDeleteFile(file.id, file.name)}
                        className={`flex-1 py-2 sm:py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-colors border ${
                          isDarkMode
                            ? 'bg-gray-700 hover:bg-red-900/30 text-gray-300 hover:text-red-400 border-gray-600 hover:border-red-800'
                            : 'bg-gray-50 hover:bg-red-50 text-gray-700 hover:text-red-600 border-gray-200 hover:border-red-200'
                        }`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`rounded-xl sm:rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl border mx-4 ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <h3 className={`text-xl sm:text-2xl font-bold mb-2 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Share File
            </h3>
            <p className={`text-sm mb-4 sm:mb-6 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {selectedFile?.name}
            </p>

            <div className="space-y-4 sm:space-y-5">
              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="user@example.com"
                  className={`w-full px-3 sm:px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium transition-all ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Permission
                </label>
                <select
                  value={sharePermission}
                  onChange={(e) =>
                    setSharePermission(e.target.value as "view" | "edit")
                  }
                  className={`w-full px-3 sm:px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium transition-all ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="view">View Only</option>
                  <option value="edit">Can Edit</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 sm:gap-3 mt-6 sm:mt-8">
              <button
                onClick={executeShare}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors"
              >
                Share
              </button>
              <button
                onClick={() => setShowShareModal(false)}
                className={`flex-1 py-2.5 rounded-lg font-semibold border transition-colors text-sm ${
                  isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-300'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}