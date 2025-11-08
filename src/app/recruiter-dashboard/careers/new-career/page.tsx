"use client";

import React from "react";
import HeaderBar from "@/lib/PageComponent/HeaderBar";
// Temporarily replace single form with segmented wizard
import NewCareerWizard from "@/lib/components/CareerComponents/NewCareerWizard";

export default function NewCareerPage() {
  return (
    <>
      <HeaderBar activeLink="Careers" currentPage="Add new career" icon="la la-suitcase" />
      <div className="container-fluid mt--7" style={{ paddingTop: "6rem" }}>
        <div className="row">
          <NewCareerWizard />
        </div>
      </div>
    </>
  )
}
