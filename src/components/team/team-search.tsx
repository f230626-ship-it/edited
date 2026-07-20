"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Mail, Phone, Briefcase, Users, Building2 } from "lucide-react";
import { ROLE_LABELS } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";

interface TeamSearchProps {
  employees: any[];
  departments: any[];
}

export function TeamSearch({ employees, departments }: TeamSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const filteredEmployees = searchTerm
    ? employees.filter(
        (emp) =>
          emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.designation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.employee_code?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setIsSearching(value.length > 0);
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <Card className="overflow-hidden border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 shadow-lg">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name, email, designation, or employee code..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-12 pl-10 text-base border-2 focus:border-primary"
            />
          </div>
          
          {/* Quick Stats */}
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg bg-background/80 p-3 text-center">
              <Users className="mx-auto h-5 w-5 text-primary mb-1" />
              <p className="text-2xl font-bold">{employees.length}</p>
              <p className="text-xs text-muted-foreground">Total Members</p>
            </div>
            <div className="rounded-lg bg-background/80 p-3 text-center">
              <Building2 className="mx-auto h-5 w-5 text-green-600 mb-1" />
              <p className="text-2xl font-bold">{departments.length}</p>
              <p className="text-xs text-muted-foreground">Departments</p>
            </div>
            <div className="rounded-lg bg-background/80 p-3 text-center">
              <Briefcase className="mx-auto h-5 w-5 text-blue-600 mb-1" />
              <p className="text-2xl font-bold">
                {new Set(employees.map(e => e.designation)).size}
              </p>
              <p className="text-xs text-muted-foreground">Roles</p>
            </div>
            <div className="rounded-lg bg-background/80 p-3 text-center">
              <Mail className="mx-auto h-5 w-5 text-purple-600 mb-1" />
              <p className="text-2xl font-bold">100%</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      <AnimatePresence>
        {isSearching && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-2 border-primary/30 shadow-xl">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Search className="h-5 w-5 text-primary" />
                    Search Results
                  </h3>
                  <Badge variant="secondary">
                    {filteredEmployees.length} {filteredEmployees.length === 1 ? 'result' : 'results'}
                  </Badge>
                </div>

                {filteredEmployees.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredEmployees.map((employee, index) => {
                      const initials = employee.full_name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2);

                      return (
                        <motion.div
                          key={employee.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className="group rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
                        >
                          <div className="flex items-start gap-3">
                            <Avatar className="h-12 w-12 ring-2 ring-border group-hover:ring-primary/50 transition-all">
                              <AvatarImage src={employee.profile_photo_url ?? undefined} />
                              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold truncate group-hover:text-primary transition-colors">
                                {employee.full_name}
                              </h4>
                              {employee.employee_code && (
                                <p className="text-xs text-muted-foreground font-mono">
                                  #{employee.employee_code}
                                </p>
                              )}
                              <div className="mt-2 space-y-1">
                                <div className="flex items-center gap-2 text-xs">
                                  <Briefcase className="h-3 w-3 text-primary" />
                                  <span className="truncate">{employee.designation}</span>
                                </div>
                                {employee.email && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <Mail className="h-3 w-3 text-primary" />
                                    <a
                                      href={`mailto:${employee.email}`}
                                      className="truncate hover:text-primary hover:underline"
                                    >
                                      {employee.email}
                                    </a>
                                  </div>
                                )}
                              </div>
                              <Badge variant="outline" className="mt-2 text-[10px]">
                                {ROLE_LABELS[employee.role] ?? employee.role}
                              </Badge>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <Search className="mx-auto h-12 w-12 text-muted-foreground/30" />
                    <h4 className="mt-4 font-semibold">No results found</h4>
                    <p className="text-sm text-muted-foreground">
                      Try searching with different keywords
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
