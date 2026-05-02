import * as React from "react";
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { describe, test, expect } from "vitest";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableHeaderCell,
  TableCaption,
} from "./Table";

expect.extend(toHaveNoViolations);

describe("Table Component Axe Accessibility Testing", () => {
  test("table should have no accessibility violations", async () => {
    const { container } = render(
      <Table>
        <TableCaption>Test Table</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Header 1</TableHead>
            <TableHead>Header 2</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableHeaderCell>Row Header</TableHeaderCell>
            <TableCell>Data 1</TableCell>
            <TableCell>Data 2</TableCell>
          </TableRow>
          <TableRow>
            <TableHeaderCell>Row Header 2</TableHeaderCell>
            <TableCell>Data 3</TableCell>
            <TableCell>Data 4</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableHead>Footer 1</TableHead>
            <TableHead>Footer 2</TableHead>
          </TableRow>
        </TableFooter>
      </Table>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});