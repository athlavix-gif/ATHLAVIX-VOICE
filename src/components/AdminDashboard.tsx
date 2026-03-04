import React, { useState, useEffect } from "react";
import { UserState } from "../types";
import { Phone, User, Calendar, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";

interface AdminDashboardProps {
  onClose: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const [users, setUsers] = useState<UserState[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/admin/users");
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch (err) {
        console.error("Failed to fetch users:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-athlavix-bg overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <button 
            onClick={onClose}
            className="flex items-center gap-2 text-athlavix-accent font-bold hover:underline"
          >
            <ArrowLeft size={20} /> Back to App
          </button>
          <h1 className="text-2xl font-bold text-athlavix-accent">Customer Database</h1>
        </div>

        {loading ? (
          <div className="text-center py-20 opacity-50">Loading customers...</div>
        ) : (
          <div className="grid gap-4">
            {users.length > 0 ? (
              users.map((user) => (
                <motion.div 
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-athlavix-accent/10 rounded-full flex items-center justify-center text-athlavix-accent overflow-hidden shrink-0">
                      {user.avatar ? (
                        <img src={user.avatar} alt="User" className="w-full h-full object-cover" />
                      ) : (
                        <User size={24} />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-athlavix-accent">{user.name}</h3>
                      <p className="text-sm opacity-60 flex items-center gap-1">
                        <Calendar size={14} /> Level {user.level} • {user.points} pts
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col md:items-end gap-1">
                    <div className="flex items-center gap-2 text-athlavix-accent font-bold">
                      <Phone size={18} />
                      <a href={`https://wa.me/${user.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="hover:underline">
                        {user.whatsapp}
                      </a>
                    </div>
                    <p className="text-xs opacity-50 uppercase tracking-widest font-bold">WhatsApp Number</p>
                  </div>

                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-white/50 rounded-full text-[10px] font-bold uppercase tracking-wider text-athlavix-accent border border-athlavix-accent/10">
                      {user.skinType || "Unknown Skin"}
                    </span>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-20 glass-card opacity-50 italic">
                No users registered yet.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
