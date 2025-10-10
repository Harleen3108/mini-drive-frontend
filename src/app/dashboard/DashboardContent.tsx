"use client";
import { useEffect, useState } from "react";
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
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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
  };

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

          const { data, error } = await supabase
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
        } catch (error: any) {
          alert("Upload failed: " + error.message);
        }
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      alert("Upload failed: " + error.message);
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
    } catch (error: any) {
      alert("Delete failed: " + error.message);
    }
  };

  const handleShareFile = (file: File) => {
    setSelectedFile(file);
    setShowShareModal(true);
  };

  const executeShare = async () => {
    if (!selectedFile || !shareEmail) return;

    try {
      console.log("Starting share process...");
      console.log("File:", selectedFile.name);
      console.log("Target email:", shareEmail);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        console.log("No session found");
        return;
      }

      console.log("Looking for user with email:", shareEmail);

      const { data: targetUser, error: userError } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("email", shareEmail)
        .single();

      console.log("User lookup result:", targetUser);
      console.log("User lookup error:", userError);

      if (userError || !targetUser) {
        alert(`User "${shareEmail}" not found! Make sure they have signed up.`);
        return;
      }

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
        `✅ File shared with ${shareEmail} (${sharePermission} permission)`
      );
      setShowShareModal(false);
      setShareEmail("");
      setSelectedFile(null);
    } catch (error: any) {
      console.error("Share failed:", error);
      alert("Share failed: " + error.message);
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

  const containerClass = `min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 ${
    isDarkMode ? "dark" : ""
  }`;

  if (loading) {
    return (
      <div className={containerClass}>
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-slate-200 dark:border-slate-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-lg font-semibold text-slate-900 dark:text-white">
              Loading your drive
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Just a moment...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                <svg
                  className="w-6 h-6 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Mini Drive
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Secure File Management
                </p>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col items-end">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {user?.email}
                </p>
                {user?.role === "admin" && (
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    ADMINISTRATOR
                  </span>
                )}
              </div>
              <label className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer font-semibold text-sm shadow-sm hover:shadow-md">
                Upload
                <input
                  type="file"
                  className="hidden"
                  onChange={handleUpload}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt"
                />
              </label>
              {/* Theme Toggle Button */}
              {/* <button
                onClick={toggleTheme}
                className="p-2.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600 transition-all duration-200 shadow-sm hover:shadow-md"
                title={
                  isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"
                }
                aria-label={
                  isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"
                }
              >
                {isDarkMode ? "☀️" : "🌙"}
              </button> */}
              <button
                onClick={handleSignOut}
                className="px-4 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors font-semibold text-sm border border-slate-200 dark:border-slate-600"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-8 border-t border-slate-200/50 dark:border-slate-700/50 px-0">
            <button
              onClick={() => setActiveTab("files")}
              className={`py-4 px-0 border-b-2 font-semibold text-sm transition-all ${
                activeTab === "files"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              My Files{" "}
              <span className="text-slate-400 dark:text-slate-500">
                ({files.length})
              </span>
            </button>
            <button
              onClick={() => setActiveTab("shared")}
              className={`py-4 px-0 border-b-2 font-semibold text-sm transition-all ${
                activeTab === "shared"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Shared{" "}
              <span className="text-slate-400 dark:text-slate-500">
                ({sharedFiles.length})
              </span>
            </button>
            {user?.role === "admin" && (
              <button
                onClick={() => setActiveTab("admin")}
                className={`py-4 px-0 border-b-2 font-semibold text-sm transition-all ${
                  activeTab === "admin"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Users{" "}
                <span className="text-slate-400 dark:text-slate-500">
                  ({allUsers.length})
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {/* Shared Files Tab */}
        {activeTab === "shared" && (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                Shared Files
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                Files shared with you by other users
              </p>
            </div>

            {sharedFiles.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 p-16 text-center">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                  No shared files yet
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  When others share files with you, they'll appear here
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sharedFiles.map((share) => (
                  <div
                    key={share.id}
                    className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 p-6"
                  >
                    <div className="mb-4">
                      <h3
                        className="font-semibold text-slate-900 dark:text-white truncate text-base mb-2"
                        title={share.files?.name}
                      >
                        {share.files?.name}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {formatFileSize(share.files?.size || 0)}
                      </p>
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <p className="text-xs text-slate-500 dark:text-slate-500 mb-2">
                          From
                        </p>
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          {share.shared_by_profile?.email}
                        </p>
                        <div className="mt-3 inline-block">
                          <span
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                              share.permission === "view"
                                ? "bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600"
                                : "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
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
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors mt-4"
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
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                User Management
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                Manage system users and permissions
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-700/50">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
                  {allUsers.map((u) => (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900 dark:text-white">
                          {u.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                            u.role === "admin"
                              ? "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                              : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600"
                          }`}
                        >
                          {u.role === "admin" ? "Admin" : "User"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400 font-medium">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* My Files Panel */}
        {activeTab === "files" && (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                {user?.role === "admin" ? "All Files" : "Your Files"}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                Manage and organize your documents
              </p>
            </div>

            {files.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 p-16 text-center">
                <div className="text-6xl mb-4">📁</div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                  No files yet
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-8">
                  {user?.role === "admin"
                    ? "No files have been uploaded by any users yet."
                    : "Upload your first file to get started"}
                </p>
                <label className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer font-semibold text-sm shadow-md hover:shadow-lg">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 p-6 group"
                  >
                    <div className="mb-4">
                      <h3
                        className="font-semibold text-slate-900 dark:text-white truncate text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                        title={file.name}
                      >
                        {file.name}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                        {formatFileSize(file.size)}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-3">
                        {new Date(file.created_at).toLocaleDateString()}
                      </p>
                      {user?.role === "admin" && file.profiles && (
                        <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-2">
                          Owner: {file.profiles.email}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewFile(file)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors"
                      >
                        Open
                      </button>
                      <button
                        onClick={() => handleShareFile(file)}
                        className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 py-2.5 rounded-lg font-semibold text-sm transition-colors border border-slate-200 dark:border-slate-600 hover:border-blue-200 dark:hover:border-blue-800"
                      >
                        Share
                      </button>
                      <button
                        onClick={() => handleDeleteFile(file.id, file.name)}
                        className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 py-2.5 rounded-lg font-semibold text-sm transition-colors border border-slate-200 dark:border-slate-600 hover:border-red-200 dark:hover:border-red-800"
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
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 w-full max-w-md shadow-2xl border border-slate-200/50 dark:border-slate-700/50">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Share File
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              {selectedFile?.name}
            </p>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm font-medium transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Permission
                </label>
                <select
                  value={sharePermission}
                  onChange={(e) =>
                    setSharePermission(e.target.value as "view" | "edit")
                  }
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm font-medium transition-all"
                >
                  <option value="view">View Only</option>
                  <option value="edit">Can Edit</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={executeShare}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-semibold transition-colors"
              >
                Share
              </button>
              <button
                onClick={() => setShowShareModal(false)}
                className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 py-2.5 rounded-lg font-semibold border border-slate-200 dark:border-slate-600 transition-colors"
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
