import * as React from "react";
import { render, screen } from "@testing-library/react";
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

describe("Table Component Accessibility", () => {
  test("renders table with correct scope attributes", () => {
    render(
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
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableHead>Footer 1</TableHead>
            <TableHead>Footer 2</TableHead>
          </TableRow>
        </TableFooter>
      </Table>
    );

    // Check that TableHead (th) has scope="col"
    const headerCells = screen.getAllByRole("columnheader");
    expect(headerCells).toHaveLength(4); // 2 in thead + 2 in tfoot
    headerCells.forEach((cell) => {
      expect(cell).toHaveAttribute("scope", "col");
    });

    // Check that TableHeaderCell (th) has scope="row"
    const rowHeaderCell = screen.getByRole("rowheader");
    expect(rowHeaderCell).toHaveAttribute("scope", "row");

    // Check that TableCell (td) does not have a scope attribute
    const dataCells = screen.getAllByRole("cell");
    expect(dataCells).toHaveLength(2);
    dataCells.forEach((cell) => {
      expect(cell).not.toHaveAttribute("scope");
    });
  });

  test("renders table caption", () => {
    render(
      <Table>
        <TableCaption>Test Caption</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Head</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    const captionElement = screen.getByText("Test Caption");
    expect(captionElement).toBeInTheDocument();
    expect(captionElement.tagName).toBe("CAPTION");
  });

  test("TableHeader, TableBody, and TableFooter render correctly", () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Header</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Body</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Footer</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    );

    const table = screen.getByRole("table");
    expect(table.querySelector("thead")).toBeInTheDocument();
    expect(table.querySelector("tbody")).toBeInTheDocument();
    expect(table.querySelector("tfoot")).toBeInTheDocument();
  });

  test("TableHead renders as th element", () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Column Header</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    const th = screen.getByRole("columnheader", { name: "Column Header" });
    expect(th).toBeInTheDocument();
    expect(th.tagName).toBe("TH");
  });

  test("TableCell renders as td element", () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Cell Data</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    const td = screen.getByRole("cell", { name: "Cell Data" });
    expect(td).toBeInTheDocument();
    expect(td.tagName).toBe("TD");
  });

  test("custom className is applied to Table", () => {
    render(
      <Table data-testid="custom-table" className="custom-class">
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    const table = screen.getByTestId("custom-table").querySelector("table");
    expect(table).toHaveClass("custom-class");
  });

  test("custom className is applied to TableBody", () => {
    render(
      <Table>
        <TableBody className="custom-body-class">
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    const tbody = screen.getByRole("table").querySelector("tbody");
    expect(tbody).toHaveClass("custom-body-class");
  });

  test("Table has overflow-auto wrapper for responsiveness", () => {
    render(
      <Table data-testid="responsive-table">
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    const wrapper = screen.getByTestId("responsive-table");
    expect(wrapper).toHaveClass("overflow-auto");
  });
});