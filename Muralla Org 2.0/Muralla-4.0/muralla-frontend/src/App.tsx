import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import Dashboard from './components/modules/dashboard/Dashboard'
import FinanceDashboard from './components/modules/finance/FinanceDashboard'
import PeopleOverview from './components/modules/people/PeopleOverview'
import TeamDirectory from './components/modules/people/TeamDirectory'
import StaffFinances from './components/modules/people/StaffFinances'
import KnowledgeOverview from './components/modules/knowledge/KnowledgeOverview'
import BankAccount from './components/modules/finance/BankAccount'
import PlaceholderPage from './components/common/PlaceholderPage'
import PTO from './components/modules/people/PTO'

function App() {
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    // Check for user preference or system preference
    const isDarkMode = localStorage.getItem('darkMode') === 'true' || 
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
    
    setDarkMode(isDarkMode)
    
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    localStorage.setItem('darkMode', String(newDarkMode))
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <Router>
      <MainLayout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
        <Routes>
          <Route index element={<Dashboard />} />
          
          {/* Knowledge Hub Routes */}
          <Route path="/knowledge" element={<KnowledgeOverview />} />
          <Route path="/knowledge/policies" element={<PlaceholderPage title="Policies & SOPs" description="Company policies, procedures, and compliance documentation" icon="📋" />} />
          <Route path="/knowledge/playbooks" element={<PlaceholderPage title="Playbooks & Templates" description="Reusable frameworks and templates for common scenarios" icon="📖" />} />
          <Route path="/knowledge/wiki" element={<PlaceholderPage title="Institutional Memory" description="Wiki pages, lessons learned, and organizational knowledge" icon="🧠" />} />
          
          {/* Projects & Tasks Routes */}
          <Route path="/projects" element={<PlaceholderPage title="Projects & Tasks" description="Project management with multiple views and collaboration tools" icon="📋" />} />
          <Route path="/projects/kanban" element={<PlaceholderPage title="Kanban Board" description="Visual task management with drag-and-drop functionality" icon="📊" />} />
          <Route path="/projects/timeline" element={<PlaceholderPage title="Timeline View" description="Gantt-style project timeline and dependencies" icon="📅" />} />
          <Route path="/projects/calendar" element={<PlaceholderPage title="Calendar View" description="Calendar-based project and task scheduling" icon="🗓️" />} />
          <Route path="/projects/backlog" element={<PlaceholderPage title="Backlog" description="Product backlog and sprint planning" icon="📝" />} />
          <Route path="/projects/goals" element={<PlaceholderPage title="Goal Tree" description="Hierarchical goal tracking and OKRs" icon="🎯" />} />
          
          {/* People & Roles Routes */}
          <Route path="/people" element={<PeopleOverview />} />
          <Route path="/people/directory" element={<TeamDirectory />} />
          <Route path="/people/shifts" element={<PlaceholderPage title="Shifts & Attendance" description="Real-time visibility into who is on the clock" icon="⏰" />} />
          <Route path="/people/pto" element={<PTO />} />
          <Route path="/people/finances" element={<StaffFinances />} />
          
          {/* Finance & Analytics Routes */}
          <Route path="/finance" element={<FinanceDashboard />} />
          <Route path="/finance/bank" element={<BankAccount />} />
          <Route path="/finance/transactions" element={<PlaceholderPage title="Revenue & Expenses" description="Real-time ledger of every transaction" icon="💳" />} />
          <Route path="/finance/taxes" element={<PlaceholderPage title="Taxes & VAT" description="Keep the business compliant with tax management" icon="🧾" />} />
          <Route path="/finance/budgets" element={<PlaceholderPage title="Budgets" description="Set spending guardrails and monitor variances" icon="📊" />} />
          <Route path="/finance/kpis" element={<PlaceholderPage title="KPI Dashboards" description="Surface financial metrics that matter at a glance" icon="📈" />} />
          <Route path="/finance/forecasts" element={<PlaceholderPage title="Scenario Planning" description="Model alternative futures and prepare decisions" icon="🔮" />} />
          
          {/* Inventory & Sales Routes */}
          <Route path="/inventory" element={<PlaceholderPage title="Inventory & Sales" description="Track products, sales, and stock movements" icon="📦" />} />
          <Route path="/inventory/products" element={<PlaceholderPage title="Products" description="Authoritative catalog for every item or service" icon="🏷️" />} />
          <Route path="/inventory/sales" element={<PlaceholderPage title="Sales" description="Record revenue events and inventory deductions" icon="💰" />} />
          <Route path="/inventory/stock" element={<PlaceholderPage title="Stock" description="Location-based snapshot of on-hand quantities" icon="📊" />} />
          <Route path="/inventory/movements" element={<PlaceholderPage title="Other Movements" description="Non-sales inventory changes and adjustments" icon="🔄" />} />
          
          {/* CRM & Community Routes */}
          <Route path="/crm" element={<PlaceholderPage title="CRM & Community" description="Customer relationship management and community engagement" icon="👥" />} />
          <Route path="/crm/contacts" element={<PlaceholderPage title="Contacts" description="Customer and prospect contact management" icon="📞" />} />
          <Route path="/crm/segments" element={<PlaceholderPage title="Segments" description="Customer segmentation and targeting" icon="🎯" />} />
          <Route path="/crm/logs" element={<PlaceholderPage title="Activity Logs" description="Track customer interactions and touchpoints" icon="📝" />} />
          <Route path="/crm/feedback" element={<PlaceholderPage title="Feedback" description="Collect and manage customer feedback" icon="💬" />} />
          
          {/* Events & Scheduling Routes */}
          <Route path="/events" element={<PlaceholderPage title="Events & Scheduling" description="Event management and resource scheduling" icon="🎉" />} />
          <Route path="/events/calendar" element={<PlaceholderPage title="Calendar" description="Event calendar and scheduling interface" icon="📅" />} />
          <Route path="/events/bookings" element={<PlaceholderPage title="Bookings" description="Event bookings and reservation management" icon="🎫" />} />
          <Route path="/events/resources" element={<PlaceholderPage title="Resource Allocation" description="Manage event resources and equipment" icon="🛠️" />} />
          
          {/* Notifications Routes */}
          <Route path="/notifications" element={<PlaceholderPage title="Notifications" description="Alert management and automation rules" icon="🔔" />} />
          <Route path="/notifications/inbox" element={<PlaceholderPage title="Alert Inbox" description="Centralized notification management" icon="📥" />} />
          <Route path="/notifications/rules" element={<PlaceholderPage title="Rules Engine" description="Create automated notification rules" icon="⚙️" />} />
          <Route path="/notifications/templates" element={<PlaceholderPage title="Templates" description="Manage notification templates" icon="📄" />} />
          
          {/* Settings */}
          <Route path="/settings" element={<PlaceholderPage title="Settings" description="System configuration and preferences" icon="⚙️" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </MainLayout>
    </Router>
  )
}

export default App
