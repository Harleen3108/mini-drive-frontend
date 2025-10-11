"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface File {
  id: string;
  filename: string;
  url: string;
  file_size: number;
  user_id: string;
  created_at: string;
  file_type?: string;
  file_path?: string;
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
  const [activeTab, setActiveTab] = useState<"files" | "shared" | "admin">("files");
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [sharePermission, setSharePermission] = useState<"view" | "edit">("view");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  // Debug effect
  useEffect(() => {
    console.log("🎯 DASHBOARD STATE UPDATE:", {
      user: user,
      userRole: user?.role,
      isAdmin: user?.role === "admin",
      filesCount: files.length,
      usersCount: allUsers.length,
      sharedFilesCount: sharedFiles.length,
      activeTab: activeTab,
      loading: loading,
    });
  }, [user, files, allUsers, sharedFiles, activeTab, loading]);

  // Add this SIMPLE debug to your DashboardContent component
  useEffect(() => {
    console.log("🔍 SIMPLE DEBUG - User 2:", {
      userEmail: user?.email,
      userId: user?.id,
      sharedFilesCount: sharedFiles.length
    });
  }, [user, sharedFiles]);

  // Load theme preference on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme) {
        setIsDarkMode(savedTheme === "dark");
      } else {
        setIsDarkMode(window.matchMedia("(prefers-color-scheme: dark)").matches);
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
    console.log("📁 Loading user files for:", userId);
    const { data: filesData, error } = await supabase
      .from("files")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Error loading user files:", error);
    } else {
      console.log("✅ User files loaded:", filesData?.length || 0);
    }

    setFiles(filesData || []);
  };

  const loadSharedFiles = async (userId: string) => {
    console.log("🔗 Loading shared files for user:", userId);

    const { data: sharedData, error } = await supabase
      .from("file_shares")
      .select(
        `
        id,
        file_id,
        shared_by,
        shared_with,
        permission,
        created_at,
        files:file_id (
          id,
          filename,
          file_path,
          file_size,
          file_type,
          url,
          user_id,
          created_at,
          profiles:user_id (
            email
          )
        ),
        shared_by_profile:shared_by (
          email
        )
      `
      )
      .eq("shared_with", userId);

    if (error) {
      console.error("❌ Error loading shared files:", error);
    } else {
      console.log("✅ Shared files loaded:", sharedData);
      // Log each shared file to see what we're getting
      sharedData?.forEach((share, index) => {
        console.log(`📁 Shared file ${index + 1}:`, {
          shareId: share.id,
          fileId: share.file_id,
          fileName: share.files?.[0]?.filename,
          filePath: Array.isArray(share.files)
            ? share.files[0]?.file_path
            : undefined,
          sharedBy: Array.isArray(share.shared_by_profile)
            ? share.shared_by_profile[0]?.email
            : undefined,
        });
      });
    }

    // 👇 ADD THIS LINE TO SAVE THE DATA
    setSharedFiles(
      (sharedData || []).map((share: any) => ({
        ...share,
        files: Array.isArray(share.files) ? share.files[0] : share.files,
        shared_by_profile: Array.isArray(share.shared_by_profile) ? share.shared_by_profile[0] : share.shared_by_profile,
      }))
    );
  };

  const loadAdminData = async () => {
    console.log("👑 LOADING ADMIN DATA...");

    try {
      // Load all files with owner emails
      console.log("🔄 Loading all files...");
      const { data: filesData, error: filesError } = await supabase
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

      if (filesError) {
        console.error("❌ Error loading admin files:", filesError);
        console.error("Files error details:", filesError);
      } else {
        console.log("✅ Admin files loaded:", filesData?.length || 0);
        console.log("📊 Files data sample:", filesData?.slice(0, 2));
        setFiles(filesData || []);
      }

      // Load all users
      console.log("🔄 Loading all users...");
      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (usersError) {
        console.error("❌ Error loading users:", usersError);
        console.error("Users error details:", usersError);
      } else {
        console.log("✅ Admin users loaded:", usersData?.length || 0);
        console.log("📊 Users data sample:", usersData?.slice(0, 2));
        setAllUsers(usersData || []);
      }
    } catch (error) {
      console.error("💥 Error in loadAdminData:", error);
    }
  };

  // Define loadData with useCallback
  const loadData = useCallback(async () => {
    console.log("🚀 STARTING LOADDATA...");
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("❌ Session error:", sessionError);
        return;
      }

      if (!session) {
        console.log("❌ No session - redirecting to home");
        router.push("/");
        return;
      }

      console.log("👤 Session user ID:", session.user.id);

      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (userError) {
        console.error("❌ Error loading user profile:", userError);
        return;
      }

      console.log("✅ User profile loaded:", userData);
      setUser(userData);

      // Load appropriate data based on role
      if (userData?.role === "admin") {
        console.log("🎯 User is ADMIN - loading admin data");
        await loadAdminData();
      } else {
        console.log("🎯 User is REGULAR USER - loading user data");
        await loadUserFiles(session.user.id);
      }

      await loadSharedFiles(session.user.id);
    } catch (error) {
      console.error("💥 Error in loadData:", error);
    } finally {
      console.log("🏁 LoadData completed");
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    console.log("🔔 useEffect triggered - calling loadData");
    loadData();
  }, [loadData]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log("📁 File selected:", file.name, file.size, file.type);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Session error:", sessionError);
        alert("Authentication error: " + sessionError.message);
        return;
      }

      if (!session) {
        alert("Please log in to upload files");
        return;
      }

      console.log("👤 User session:", session.user.id);

      // Create unique file path
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()
        .toString(36)
        .substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;

      console.log("📤 Uploading to path:", filePath);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("files")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("❌ Storage upload error:", uploadError);
        alert("Upload failed: " + uploadError.message);
        return;
      }

      console.log("✅ File uploaded to storage:", uploadData);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("files")
        .getPublicUrl(filePath);

      console.log("🔗 Public URL:", urlData);

      // Save to database
      const { data: fileData, error: dbError } = await supabase
        .from("files")
        .insert([
          {
            user_id: session.user.id,
            filename: file.name,
            file_path: filePath,
            file_size: file.size,
            file_type: file.type,
            url: urlData.publicUrl,
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (dbError) {
        console.error("❌ Database insert error:", dbError);
        alert("Database save failed: " + dbError.message);
        return;
      }

      console.log("✅ File saved to database:", fileData);
      alert("🎉 File uploaded successfully!");
      loadData();
      event.target.value = "";
    } catch (error: unknown) {
      console.error("💥 Unexpected error:", error);
      const errorMessage = error instanceof Error ? error.message : "Upload failed";
      alert("Upload failed: " + errorMessage);
    }
  };

  const handleViewFile = async (file: File) => {
    if (!file) {
      console.error("❌ handleViewFile called with undefined file");
      alert("File data is missing. Please try refreshing the page.");
      return;
    }

    if (!file.filename) {
      console.error("❌ File missing filename:", file);
      alert("File data is incomplete. Please try refreshing the page.");
      return;
    }

    try {
      console.log("🔍 Opening file:", file.filename);
    } catch (error) {
      console.error("💥 Unexpected error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to open file";
      alert("Failed to open file: " + errorMessage);
    }

    try {
      console.log("🔍 Viewing shared file:", file.filename, file.file_path);

      // For files stored in Supabase Storage
      if (file.file_path) {
        console.log("📁 File path found:", file.file_path);

        // Get signed URL for the file (works for both owner and shared users)
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from("files")
          .createSignedUrl(file.file_path, 60 * 60); // 1 hour expiry

        if (signedUrlError) {
          console.error("❌ Signed URL error:", signedUrlError);

          // Fallback: Try to get public URL
          const { data: publicUrlData } = supabase.storage
            .from("files")
            .getPublicUrl(file.file_path);

          console.log("🔄 Fallback to public URL:", publicUrlData);
          if (publicUrlData?.publicUrl) {
            window.open(publicUrlData.publicUrl, "_blank");
          } else {
            alert("Error: Could not access file. Please try again.");
          }
        } else if (signedUrlData?.signedUrl) {
          console.log("✅ Signed URL created:", signedUrlData.signedUrl);
          window.open(signedUrlData.signedUrl, "_blank");
        } else {
          alert("Error: Could not generate file URL.");
        }
      } else if (file.url && file.url.startsWith("data:")) {
        // Handle base64 encoded files (old method)
        console.log("📄 Using base64 data URL");
        const newWindow = window.open();
        if (newWindow) {
          if (file.file_type?.startsWith("image/")) {
            newWindow.document.write(`
            <html>
              <head><title>${file.filename}</title></head>
              <body style="margin:0; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#f8f9fa;">
                <img src="${file.url}" style="max-width:90%; max-height:90%; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.15);" alt="${file.filename}" />
              </body>
            </html>
          `);
          } else if (file.file_type === "application/pdf") {
            newWindow.document.write(`
            <html>
              <head><title>${file.filename}</title></head>
              <body style="margin:0;">
                <embed src="${file.url}" type="application/pdf" width="100%" height="100%" style="min-height:100vh;" />
              </body>
            </html>
          `);
          } else {
            newWindow.document.write(`
            <html>
              <head><title>${file.filename}</title></head>
              <body style="margin:0; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#f8f9fa; flex-direction:column; gap:20px;">
                <h2 style="color:#1f2937;">${file.filename}</h2>
                <p style="color:#6b7280;">This file type cannot be previewed directly.</p>
                <a href="${file.url}" download="${file.filename}" style="padding:12px 24px; background:#3b82f6; color:white; text-decoration:none; border-radius:8px; font-weight:600;">
                  Download File
                </a>
              </body>
            </html>
          `);
          }
        }
      } else if (file.url) {
        // Direct URL fallback
        console.log("🔗 Using direct URL:", file.url);
        window.open(file.url, "_blank");
      } else {
        console.error("❌ No file URL or file_path available");
        alert("File URL not available. Please contact the file owner.");
      }
    } catch (error) {
      console.error("💥 Error viewing file:", error);
      alert("Error opening file. Please check console for details.");
    }
  };

  // Also add this function for admin user management
  const handleAdminDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Admin: Delete user "${userEmail}" and all their files?`)) return;

    try {
      // First delete user's files
      const { error: filesError } = await supabase
        .from("files")
        .delete()
        .eq("user_id", userId);

      if (filesError) throw filesError;

      // Then delete user's profile
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (profileError) throw profileError;

      alert("✅ User and all their files deleted!");
      loadData();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Delete failed";
      alert("Delete failed: " + errorMessage);
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
      const errorMessage = error instanceof Error ? error.message : "Delete failed";
      alert("Delete failed: " + errorMessage);
    }
  };

  const handleShareFile = (file: File) => {
    setSelectedFile(file);
    setShowShareModal(true);
  };

  const executeShare = async () => {
    if (!selectedFile || !shareEmail) {
      console.log("❌ Missing file or email");
      return;
    }

    try {
      console.log("🚀 STARTING SHARE PROCESS");
      console.log("📁 Selected file:", selectedFile);
      console.log("📧 Target email:", shareEmail);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log("❌ No user session");
        return;
      }

      console.log("👤 Current user:", session.user.id, session.user.email);

      // Find target user
      console.log("🔍 Looking for target user:", shareEmail);
      const { data: targetUser, error: userError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', shareEmail.toLowerCase())
        .single();

      console.log("🎯 Target user result:", { targetUser, userError });

      if (userError || !targetUser) {
        console.log("❌ User not found error:", userError);
        alert(`User "${shareEmail}" not found! Please ask them to sign up first.`);
        return;
      }

      console.log("✅ Found target user:", targetUser);

      // Check self-sharing
      if (targetUser.id === session.user.id) {
        console.log("❌ Trying to share with self");
        alert("❌ You cannot share a file with yourself!");
        return;
      }

      // Create share record
      console.log("💾 Creating share record...");
      const { data: shareResult, error: shareError } = await supabase
        .from('file_shares')
        .insert([
          {
            file_id: selectedFile.id,
            shared_by: session.user.id,
            shared_with: targetUser.id,
            permission: sharePermission,
            created_at: new Date().toISOString()
          }
        ])
        .select();

      console.log("📊 Share creation result:", { shareResult, shareError });

      if (shareError) {
        console.log("❌ Share creation failed:", shareError);
        alert(`Share failed: ${shareError.message}`);
        return;
      }

      console.log("✅ Share successful! Result:", shareResult);
      alert(`✅ File "${selectedFile.filename}" shared successfully with ${shareEmail}!`);
      
      // Reset
      setShowShareModal(false);
      setShareEmail("");
      setSelectedFile(null);

    } catch (error) {
      console.error("💥 Unexpected error in executeShare:", error);
      alert("An unexpected error occurred. Please try again.");
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

  return (
    <div className={`min-h-screen ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      {/* Header */}
      <div className={`sticky top-0 z-40 backdrop-blur-xl border-b ${isDarkMode ? "bg-gray-800/95 border-gray-700" : "bg-white/95 border-gray-200"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg sm:p-2.5">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                </svg>
              </div>
              <div>
                <h1 className={`text-xl sm:text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                  Mini Drive
                </h1>
                <p className={`text-xs font-medium ${isDarkMode ? "text-gray-400" : "text-gray-500"} hidden sm:block`}>
                  Secure File Management
                </p>
              </div>
            </div>

            {/* Desktop Right Section */}
            <div className="hidden sm:flex items-center gap-4">
              <div className="hidden md:flex flex-col items-end">
                <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                  {user?.email}
                </p>
                <span className={`text-xs font-bold ${user?.role === "admin" ? "text-purple-600" : "text-green-600"}`}>
                  {user?.role === "admin" ? "ADMINISTRATOR" : "USER"}
                </span>
              </div>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-colors ${isDarkMode ? "bg-gray-700 hover:bg-gray-600 text-yellow-400" : "bg-gray-200 hover:bg-gray-300 text-gray-700"}`}
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDarkMode ? "☀️" : "🌙"}
              </button>

              <label className={`px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer font-semibold text-sm shadow-sm hover:shadow-md ${isDarkMode ? "shadow-blue-500/10" : ""}`}>
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
                className={`px-4 py-2.5 rounded-lg transition-colors font-semibold text-sm border ${isDarkMode ? "text-gray-300 hover:bg-gray-700 border-gray-600" : "text-gray-700 hover:bg-gray-50 border-gray-300"}`}
              >
                Sign Out
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center gap-2 sm:hidden">
              {/* Theme Toggle - Mobile */}
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-colors ${isDarkMode ? "bg-gray-700 hover:bg-gray-600 text-yellow-400" : "bg-gray-200 hover:bg-gray-300 text-gray-700"}`}
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDarkMode ? "☀️" : "🌙"}
              </button>

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`p-2 rounded-lg transition-colors ${isDarkMode ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-700"}`}
              >
                {isMobileMenuOpen ? "✕" : "☰"}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className={`sm:hidden border-t ${isDarkMode ? "border-gray-700" : "border-gray-200"} py-4`}>
              <div className="flex flex-col space-y-3">
                <div className="text-center">
                  <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                    {user?.email}
                  </p>
                  <span className={`text-xs font-bold ${user?.role === "admin" ? "text-purple-600" : "text-green-600"}`}>
                    {user?.role === "admin" ? "ADMINISTRATOR" : "USER"}
                  </span>
                </div>

                <label className={`w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer font-semibold text-sm text-center shadow-sm ${isDarkMode ? "shadow-blue-500/10" : ""}`}>
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
                  className={`w-full px-4 py-3 rounded-lg transition-colors font-semibold text-sm border ${isDarkMode ? "text-gray-300 hover:bg-gray-700 border-gray-600" : "text-gray-700 hover:bg-gray-50 border-gray-300"}`}
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className={`flex gap-4 sm:gap-8 border-t px-0 overflow-x-auto ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
            <button
              onClick={() => setActiveTab("files")}
              className={`py-3 sm:py-4 px-2 sm:px-0 border-b-2 font-semibold text-sm transition-all whitespace-nowrap ${activeTab === "files" ? "border-blue-600 text-blue-600" : `border-transparent ${isDarkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"}`}`}
            >
              My Files{" "}
              <span className={isDarkMode ? "text-gray-500" : "text-gray-400"}>
                ({files.length})
              </span>
            </button>
            <button
              onClick={() => setActiveTab("shared")}
              className={`py-3 sm:py-4 px-2 sm:px-0 border-b-2 font-semibold text-sm transition-all whitespace-nowrap ${activeTab === "shared" ? "border-blue-600 text-blue-600" : `border-transparent ${isDarkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"}`}`}
            >
              Shared{" "}
              <span className={isDarkMode ? "text-gray-500" : "text-gray-400"}>
                ({sharedFiles.length})
              </span>
            </button>
            {user?.role === "admin" && (
              <button
                onClick={() => setActiveTab("admin")}
                className={`py-3 sm:py-4 px-2 sm:px-0 border-b-2 font-semibold text-sm transition-all whitespace-nowrap ${activeTab === "admin" ? "border-blue-600 text-blue-600" : `border-transparent ${isDarkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"}`}`}
              >
                Users{" "}
                <span className={isDarkMode ? "text-gray-500" : "text-gray-400"}>
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
              <h2 className={`text-2xl sm:text-3xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                Shared Files
              </h2>
              <p className={`mt-1 sm:mt-2 text-sm sm:text-base ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                Files shared with you by other users
              </p>
            </div>

            {sharedFiles.length === 0 ? (
              <div className={`rounded-xl sm:rounded-2xl border-2 border-dashed p-8 sm:p-16 text-center ${isDarkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"}`}>
                <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">📭</div>
                <h3 className={`text-lg sm:text-xl font-semibold mb-1 sm:mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                  No shared files yet
                </h3>
                <p className={`text-sm sm:text-base ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  When others share files with you, they&apos;ll appear here
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {sharedFiles.map((share) => (
                  <div
                    key={share.id}
                    className={`rounded-lg sm:rounded-xl border shadow-sm hover:shadow-lg transition-all duration-200 p-4 sm:p-6 ${isDarkMode ? "bg-gray-800 border-gray-700 hover:border-gray-600" : "bg-white border-gray-200 hover:border-gray-300"}`}
                  >
                    <div className="mb-3 sm:mb-4">
                      <h3
                        className={`font-semibold truncate text-sm sm:text-base mb-1 sm:mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}
                        title={share.files?.filename}
                      >
                        {share.files?.filename}
                      </h3>
                      <p className={`text-xs sm:text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                        {formatFileSize(share.files?.file_size || 0)}
                      </p>

                      {/* 👇 THIS SECTION SHOULD SHOW THE SHARED BY EMAIL */}
                      <div className={`mt-3 sm:mt-4 pt-3 sm:pt-4 border-t ${isDarkMode ? "border-gray-700" : "border-gray-100"}`}>
                        <p className={`text-xs mb-1 sm:mb-2 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                          From
                        </p>
                        <p className="text-xs sm:text-sm font-medium text-blue-600 truncate">
                          {share.shared_by_profile?.email || "Unknown user"}
                        </p>
                        <div className="mt-2 sm:mt-3 inline-block">
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded-full border ${share.permission === "view" ? isDarkMode ? "bg-gray-700 text-gray-300 border-gray-600" : "bg-gray-50 text-gray-700 border-gray-200" : isDarkMode ? "bg-blue-900/30 text-blue-300 border-blue-800" : "bg-blue-50 text-blue-700 border-blue-200"}`}
                          >
                            {share.permission === "view" ? "View Only" : "Can Edit"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (share.files) {
                          handleViewFile(share.files);
                        } else {
                          console.error("❌ No file data found for share:", share.id);
                          alert("File data is missing. Please try refreshing the page.");
                        }
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 sm:py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-colors"
                      disabled={!share.files}
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
              <h2 className={`text-2xl sm:text-3xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                Admin Dashboard
              </h2>
              <p className={`mt-1 sm:mt-2 text-sm sm:text-base ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                Manage all users and system files
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <div className={`rounded-xl p-4 sm:p-6 border ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg mr-3">
                    <span className="text-blue-600 text-lg">👥</span>
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                      Total Users
                    </p>
                    <p className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                      {allUsers.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className={`rounded-xl p-4 sm:p-6 border ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg mr-3">
                    <span className="text-green-600 text-lg">📁</span>
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                      Total Files
                    </p>
                    <p className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                      {files.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className={`rounded-xl p-4 sm:p-6 border ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg mr-3">
                    <span className="text-purple-600 text-lg">🔗</span>
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                      Shared Files
                    </p>
                    <p className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                      {sharedFiles.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className={`rounded-xl sm:rounded-2xl border shadow-sm overflow-hidden mb-8 ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
              <div className={`px-4 sm:px-6 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <h3 className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                  User Management
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className={`border-b ${isDarkMode ? "border-gray-700 bg-gray-700/50" : "border-gray-200 bg-gray-50"}`}>
                      <th className={`px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Email
                      </th>
                      <th className={`px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Role
                      </th>
                      <th className={`px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Joined
                      </th>
                      <th className={`px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? "divide-gray-700" : "divide-gray-200"}`}>
                    {allUsers.map((u) => (
                      <tr key={u.id} className={`transition-colors ${isDarkMode ? "hover:bg-gray-700/50" : "hover:bg-gray-50"}`}>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                            {u.email}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs font-semibold border ${u.role === "admin" ? isDarkMode ? "bg-purple-900/30 text-purple-300 border-purple-800" : "bg-purple-50 text-purple-700 border-purple-200" : isDarkMode ? "bg-gray-700 text-gray-300 border-gray-600" : "bg-gray-100 text-gray-700 border-gray-200"}`}
                          >
                            {u.role === "admin" ? "Admin" : "User"}
                          </span>
                        </td>
                        <td className={`px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm font-medium ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          {u.role !== "admin" && (
                            <button
                              onClick={() => handleAdminDeleteUser(u.id, u.email)}
                              className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors ${isDarkMode ? "bg-red-900/30 text-red-300 border-red-800 hover:bg-red-800/30" : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"}`}
                            >
                              Delete User
                            </button>
                          )}
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
              <h2 className={`text-2xl sm:text-3xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                {user?.role === "admin" ? "All Files" : "Your Files"}
              </h2>
              <p className={`mt-1 sm:mt-2 text-sm sm:text-base ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                Manage and organize your documents
              </p>
            </div>

            {files.length === 0 ? (
              <div className={`rounded-xl sm:rounded-2xl border-2 border-dashed p-8 sm:p-16 text-center ${isDarkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"}`}>
                <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">📁</div>
                <h3 className={`text-lg sm:text-xl font-semibold mb-1 sm:mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                  No files yet
                </h3>
                <p className={`text-sm sm:text-base mb-4 sm:mb-8 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  {user?.role === "admin" ? "No files have been uploaded by any users yet." : "Upload your first file to get started"}
                </p>
                <label className={`inline-block px-4 py-2.5 sm:px-6 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer font-semibold text-sm shadow-md hover:shadow-lg ${isDarkMode ? "shadow-blue-500/10" : ""}`}>
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
                    className={`rounded-lg sm:rounded-xl border shadow-sm hover:shadow-lg transition-all duration-200 p-4 sm:p-6 group ${isDarkMode ? "bg-gray-800 border-gray-700 hover:border-gray-600" : "bg-white border-gray-200 hover:border-gray-300"}`}
                  >
                    <div className="mb-3 sm:mb-4">
                      <h3
                        className={`font-semibold truncate text-sm sm:text-base group-hover:text-blue-600 transition-colors ${isDarkMode ? "text-white" : "text-gray-900"}`}
                        title={file.filename}
                      >
                        {file.filename}
                      </h3>
                      <p className={`text-xs sm:text-sm mt-1 sm:mt-2 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                        {formatFileSize(file.file_size)}
                      </p>
                      <p className={`text-xs mt-2 sm:mt-3 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                        {new Date(file.created_at).toLocaleDateString()}
                      </p>
                      {user?.role === "admin" && file.profiles && (
                        <p className={`text-xs font-medium mt-1 sm:mt-2 ${isDarkMode ? "text-purple-400" : "text-purple-600"}`}>
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
                        className={`flex-1 py-2 sm:py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-colors border ${isDarkMode ? "bg-gray-700 hover:bg-blue-900/30 text-gray-300 hover:text-blue-400 border-gray-600 hover:border-blue-800" : "bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-600 border-gray-200 hover:border-blue-200"}`}
                      >
                        Share
                      </button>
                      <button
                        onClick={() => handleDeleteFile(file.id, file.filename)}
                        className={`flex-1 py-2 sm:py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-colors border ${isDarkMode ? "bg-gray-700 hover:bg-red-900/30 text-gray-300 hover:text-red-400 border-gray-600 hover:border-red-800" : "bg-gray-50 hover:bg-red-50 text-gray-700 hover:text-red-600 border-gray-200 hover:border-red-200"}`}
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
          <div className={`rounded-xl sm:rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl border mx-4 ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
            <h3 className={`text-xl sm:text-2xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              Share File
            </h3>
            <p className={`text-sm mb-4 sm:mb-6 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              {selectedFile?.filename}
            </p>

            <div className="space-y-4 sm:space-y-5">
              <div>
                <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="user@example.com"
                  className={`w-full px-3 sm:px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium transition-all ${isDarkMode ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"}`}
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                  Permission
                </label>
                <select
                  value={sharePermission}
                  onChange={(e) => setSharePermission(e.target.value as "view" | "edit")}
                  className={`w-full px-3 sm:px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium transition-all ${isDarkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
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
                className={`flex-1 py-2.5 rounded-lg font-semibold border transition-colors text-sm ${isDarkMode ? "bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600" : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-300"}`}
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