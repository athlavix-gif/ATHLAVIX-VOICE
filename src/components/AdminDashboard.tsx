import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, 
  UserPlus, 
  Phone, 
  Calendar, 
  Shield, 
  Trash2, 
  Search, 
  ArrowLeft,
  Download
} from "lucide-react";
import { UserState } from "../types";

interface Staff {
  id: string;
  name: string;
  role: string;
  whatsapp: string;
  created_at: number;
}

interface AdminDashboardProps {
  onClose: () => void;
  currentUser: UserState;
}

const ADMIN_NUMBERS = ["01906992400", "01605190849", "01912368278", "01922782203"];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose, currentUser }) => {
  const [users, setUsers] = useState<UserState[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [activeTab, setActiveTab] = useState<"users" | "staff">("users");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: "", role: "", whatsapp: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const normalized = currentUser.whatsapp.replace(/\D/g, "");
      const authorized = ADMIN_NUMBERS.some(num => normalized.endsWith(num.replace(/\D/g, "")));
      
      if (!authorized) {
        alert("Unauthorized access.");
        onClose();
        return;
      }
      setIsAuthorized(true);
      fetchData();
    };
    
    checkAuth();
  }, [currentUser]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, staffRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/staff")
      ]);
      
      if (usersRes.ok && staffRes.ok) {
        const usersData = await usersRes.json();
        const staffData = await staffRes.json();
        setUsers(usersData);
        setStaff(staffData);
      }
    } catch (error) {
      console.error("Failed to fetch admin data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStaff)
      });
      
      if (res.ok) {
        setNewStaff({ name: "", role: "", whatsapp: "" });
        setIsAddingStaff(false);
        fetchData();
      }
    } catch (error) {
      console.error("Failed to add staff:", error);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm("Are you sure you want to remove this staff member?")) return;
    try {
      const res = await fetch(`/api/admin/staff/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to delete staff:", error);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.whatsapp.includes(searchTerm)
  );

  const filteredStaff = staff.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.whatsapp.includes(searchTerm)
  );

  const exportToCSV = () => {
    const headers = ["Name", "WhatsApp", "Skin Type", "Points", "Level"];
    const rows = users.map(u => [
      u.name,
      u.whatsapp,
      u.skinType || "N/A",
      u.points,
      u.level
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `athlavix_users_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (!isAuthorized && !isLoading) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[#E4E3E0] text-[#141414] font-sans flex flex-col"
    >
      {/* Header */}
      <header className="border-b border-[#141414] p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors rounded-full"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold tracking-tighter uppercase italic font-serif">
            Athlavix Command Center
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={18} />
            <input 
              type="text" 
              placeholder="Search data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border border-[#141414] rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#141414] w-64"
            />
          </div>
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 border border-[#141414] rounded-full text-sm hover:bg-[#141414] hover:text-[#E4E3E0] transition-all"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </header>

      {/* Navigation */}
      <nav className="flex border-b border-[#141414]">
        <button 
          onClick={() => setActiveTab("users")}
          className={`flex-1 py-4 text-sm font-bold uppercase tracking-widest transition-all ${
            activeTab === "users" ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-[#141414]/5"
          }`}
        >
          Customer Database ({users.length})
        </button>
        <button 
          onClick={() => setActiveTab("staff")}
          className={`flex-1 py-4 text-sm font-bold uppercase tracking-widest transition-all ${
            activeTab === "staff" ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-[#141414]/5"
          }`}
        >
          Staff Management ({staff.length})
        </button>
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#141414]"></div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto">
            {activeTab === "users" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-5 gap-4 p-4 border-b border-[#141414] opacity-50 text-[10px] uppercase font-bold tracking-widest">
                  <span>Customer Name</span>
                  <span>WhatsApp / Phone</span>
                  <span>Skin Profile</span>
                  <span>Engagement</span>
                  <span>Joined Date</span>
                </div>
                <div className="space-y-2">
                  {filteredUsers.map((user) => (
                    <motion.div 
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="grid grid-cols-5 gap-4 p-4 border border-[#141414]/10 rounded-xl hover:bg-[#141414] hover:text-[#E4E3E0] transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#141414]/10 flex items-center justify-center group-hover:bg-[#E4E3E0]/20">
                          <Users size={14} />
                        </div>
                        <span className="font-bold">{user.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="opacity-50" />
                        <span className="font-mono text-sm">{user.whatsapp}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs uppercase font-bold opacity-70">{user.skinType || "Not Set"}</span>
                        <span className="text-[10px] opacity-50">{user.concerns.join(", ") || "No concerns"}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">Level {user.level}</span>
                        <span className="text-[10px] opacity-50">{user.points} Points</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs opacity-50">
                        <Calendar size={12} />
                        {new Date(parseInt(user.id.split('_')[1])).toLocaleDateString()}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold uppercase tracking-tighter">Active Staff Members</h2>
                  <button 
                    onClick={() => setIsAddingStaff(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-[#141414] text-[#E4E3E0] rounded-full text-sm font-bold uppercase tracking-widest hover:scale-105 transition-all"
                  >
                    <UserPlus size={18} /> Add New Staff
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <AnimatePresence>
                    {isAddingStaff && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="p-6 border-2 border-dashed border-[#141414] rounded-3xl space-y-4"
                      >
                        <h3 className="font-bold uppercase text-sm tracking-widest">New Staff Profile</h3>
                        <form onSubmit={handleAddStaff} className="space-y-3">
                          <input 
                            required
                            type="text" 
                            placeholder="Full Name"
                            value={newStaff.name}
                            onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                            className="w-full bg-transparent border-b border-[#141414] p-2 text-sm focus:outline-none"
                          />
                          <input 
                            required
                            type="text" 
                            placeholder="Role (e.g. Skin Specialist)"
                            value={newStaff.role}
                            onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                            className="w-full bg-transparent border-b border-[#141414] p-2 text-sm focus:outline-none"
                          />
                          <input 
                            required
                            type="tel" 
                            placeholder="WhatsApp Number"
                            value={newStaff.whatsapp}
                            onChange={(e) => setNewStaff({ ...newStaff, whatsapp: e.target.value })}
                            className="w-full bg-transparent border-b border-[#141414] p-2 text-sm focus:outline-none"
                          />
                          <div className="flex gap-2 pt-2">
                            <button 
                              type="submit"
                              className="flex-1 bg-[#141414] text-[#E4E3E0] py-2 rounded-xl text-xs font-bold uppercase tracking-widest"
                            >
                              Save
                            </button>
                            <button 
                              type="button"
                              onClick={() => setIsAddingStaff(false)}
                              className="flex-1 border border-[#141414] py-2 rounded-xl text-xs font-bold uppercase tracking-widest"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {filteredStaff.map((s) => (
                    <motion.div 
                      key={s.id}
                      layout
                      className="p-6 border border-[#141414] rounded-3xl space-y-4 relative group"
                    >
                      <button 
                        onClick={() => handleDeleteStaff(s.id)}
                        className="absolute top-4 right-4 p-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 rounded-full"
                      >
                        <Trash2 size={18} />
                      </button>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#141414] text-[#E4E3E0] flex items-center justify-center">
                          <Shield size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{s.name}</h3>
                          <p className="text-xs uppercase font-bold opacity-50 tracking-widest">{s.role}</p>
                        </div>
                      </div>
                      <div className="pt-4 flex items-center justify-between border-t border-[#141414]/10">
                        <div className="flex items-center gap-2">
                          <Phone size={14} className="opacity-50" />
                          <span className="font-mono text-sm">{s.whatsapp}</span>
                        </div>
                        <span className="text-[10px] opacity-30">
                          Added {new Date(s.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer Stats */}
      <footer className="border-t border-[#141414] p-4 bg-[#141414] text-[#E4E3E0] flex justify-around text-[10px] uppercase font-bold tracking-[0.2em]">
        <div className="flex items-center gap-2">
          <Users size={12} /> Total Customers: {users.length}
        </div>
        <div className="flex items-center gap-2">
          <Shield size={12} /> Active Staff: {staff.length}
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={12} /> Last Sync: {new Date().toLocaleTimeString()}
        </div>
      </footer>
    </motion.div>
  );
};
