/*
 * File: frontend/src/pages/TestModal.tsx
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Created for E2E testing modal focus trapping
 * 
 * This page is only used for E2E testing of the Modal component.
 * It should not be used in production.
 */

import { useState } from "react";
import { Modal } from "../components/Modal";
import { Button } from "../components/Button";

export default function TestModalPage() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Modal Focus Trap Test Page</h1>
        
        <div className="mb-4">
          <label htmlFor="beforeInput" className="block text-gray-700 font-medium mb-2">
            Input before modal
          </label>
          <input
            id="beforeInput"
            type="text"
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Focus should not reach this when modal is open"
          />
        </div>

        <Button id="openModalBtn" onClick={() => setIsOpen(true)} className="mb-4">
          Open Modal
        </Button>

        <div className="mt-4">
          <label htmlFor="afterInput" className="block text-gray-700 font-medium mb-2">
            Input after modal trigger
          </label>
          <input
            id="afterInput"
            type="text"
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Focus should not reach this when modal is open"
          />
        </div>

        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Test Modal"
          description="This modal tests focus trapping"
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button onClick={() => setIsOpen(false)}>Confirm</Button>
            </>
          }
        >
          <div className="space-y-4">
            <label htmlFor="modalInput1" className="block">
              First input
              <input
                id="modalInput1"
                type="text"
                className="w-full px-3 py-2 border rounded-md mt-1"
                placeholder="First focusable element"
              />
            </label>
            <label htmlFor="modalInput2" className="block">
              Second input
              <input
                id="modalInput2"
                type="text"
                className="w-full px-3 py-2 border rounded-md mt-1"
                placeholder="Second focusable element"
              />
            </label>
            <label htmlFor="modalInput3" className="block">
              Third input
              <input
                id="modalInput3"
                type="text"
                className="w-full px-3 py-2 border rounded-md mt-1"
                placeholder="Third focusable element"
              />
            </label>
          </div>
        </Modal>
      </div>
    </main>
  );
}
